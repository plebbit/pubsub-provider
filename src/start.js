const http = require('http')
const httpProxy = require('http-proxy')
const Debug = require('debug')
const debugProxy = require('debug')('pubsub-provider:proxy')
const debugIpfs = require('debug')('pubsub-provider:ipfs')
// Debug.enable('pubsub-provider:*')
Debug.enable('pubsub-provider:ipfs-gateway')
const {execSync, exec} = require('child_process')
const ipfsBinaryPath = require('path').join(__dirname, '..', 'bin', 'ipfs')
const fs = require('fs')
const {URL} = require('url')
const {proxyLogs} = require('./start-logs')
const {proxyEnsProvider} = require('./ens-provider')
const {proxyIpfsGateway} = require('./ipfs-gateway')

// use basic auth to have access to any ipfs api, not just pubsub
let basicAuth
try {
  basicAuth = require('../basic-auth')
  console.log('using basic auth', basicAuth.user)
}
catch (e) {}

// init ipfs binary
try {
  execSync(`${ipfsBinaryPath} init`, {stdio: 'inherit'})
}
catch (e) {}

// turn off local discovery because sometimes it makes VPSes crash
try {
  execSync(`${ipfsBinaryPath} config profile apply server`, {stdio: 'inherit'})
}
catch (e) {
  console.log(e)
}

// config gateway to use subdomains to bypass browser 6 connections per host limit
let configedPublicGatewaysOnce = false
const configPublicGatewaysOnce = (host) => {
  if (configedPublicGatewaysOnce) {
    return
  }
  try {
    execSync(`${ipfsBinaryPath} config --json Gateway.PublicGateways '{"${host}": {"UseSubdomains": true, "Paths": ["/ipfs", "/ipns"]}}'`, {stdio: 'inherit'})
  }
  catch (e) {
    console.log(e)
  }
  configedPublicGatewaysOnce = true
}

// start ipfs daemon
const ipfsProcess = exec(`${ipfsBinaryPath} daemon --migrate --enable-pubsub-experiment --enable-namesys-pubsub`)
console.log(`ipfs process started with pid ${ipfsProcess.pid}`)
ipfsProcess.stderr.on('data', console.error)
ipfsProcess.stdin.on('data', debugIpfs)
ipfsProcess.stdout.on('data', debugIpfs)
ipfsProcess.on('error', console.error)
ipfsProcess.on('exit', () => {
  console.error(`ipfs process with pid ${ipfsProcess.pid} exited`)
  process.exit(1)
})
process.on("exit", () => {
  exec(`kill ${ipfsProcess.pid + 1}`)
})

// start proxy
const proxy = httpProxy.createProxyServer({})

// rewrite the request
proxy.on('proxyReq', function(proxyReq, req, res, options) {
  // remove headers that could potentially cause an ipfs 403 error
  proxyReq.removeHeader('CF-IPCountry')
  proxyReq.removeHeader('X-Forwarded-For')
  proxyReq.removeHeader('CF-RAY')
  proxyReq.removeHeader('CF-Visitor')
  proxyReq.removeHeader('sec-ch-ua')
  proxyReq.removeHeader('sec-ch-ua-mobile')
  proxyReq.removeHeader('user-agent')
  proxyReq.removeHeader('origin')
  proxyReq.removeHeader('sec-fetch-site')
  proxyReq.removeHeader('sec-fetch-mode')
  proxyReq.removeHeader('sec-fetch-dest')
  proxyReq.removeHeader('referer')
  proxyReq.removeHeader('CF-Connecting-IP')
  proxyReq.removeHeader('CDN-Loop')
})

proxy.on('error', (e) => {
  console.error(e)
})

// start server
const startServer = (port) => {
  const server = http.createServer()

  // never timeout the keep alive connection
  server.keepAliveTimeout = 0

  server.on('request', async (req, res) => {
    // unrelated endpoints
    if (req.url === '/service-worker.js' || req.url === '/manifest.json' || req.url === '/favicon.ico') {
      res.end()
      return
    }

    if ((req.method === 'POST' || req.method === 'OPTIONS') && req.url === '/') {
      return proxyEnsProvider(proxy, req, res)
    }

    // ipfs gateway endpoints
    if (req.method === 'GET' && (req.url.startsWith('/ipfs') || req.url.startsWith('/ipns'))) {
      configPublicGatewaysOnce(req.headers.host)
      return proxyIpfsGateway(proxy, req, res)
    }

    // logs endpoints
    if (req.url.startsWith('/logs')) {
      return proxyLogs(proxy, req, res)
    }

    // start of pubsub related endpoints
    debugProxy(req.method, req.url, req.rawHeaders)

    // basic auth allows any api
    let reqHasBasicAuth = false
    const reqBasicAuthHeader = (req.headers.authorization || '').split(' ')[1] || ''
    const [reqBasicAuthUser, reqBasicAuthPassword] = Buffer.from(reqBasicAuthHeader, 'base64').toString().split(':')
    if (basicAuth?.user && basicAuth?.password && basicAuth?.user === reqBasicAuthUser && basicAuth?.password === reqBasicAuthPassword) {
      reqHasBasicAuth = true
    }

    // no basic auth allows only pubsub api
    if (!reqHasBasicAuth && !req.url.startsWith('/api/v0/pubsub/pub') && !req.url.startsWith('/api/v0/pubsub/sub')) {
      debugProxy(`bad url '${req.url}' 403`)
      res.statusCode = 403
      res.end()
      return
    }

    // fix error 'has been blocked by CORS policy'
    res.setHeader('Access-Control-Allow-Origin', '*')

    proxy.web(req, res, {target: 'http://localhost:5001'})
  })
  server.on('error', console.error)
  server.listen(port)
  console.log(`proxy server listening on port ${port}`)
}
// listen on port 8000 because sometimes port 80 doesn't work
startServer(8000)
startServer(80)
