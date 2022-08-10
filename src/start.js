const http = require('http')
const httpProxy = require('http-proxy')
const Debug = require('debug')
const debugProxy = require('debug')('pubsub-provider:proxy')
const debugIpfs = require('debug')('pubsub-provider:ipfs')
Debug.enable('pubsub-provider:*')
const {execSync, exec} = require('child_process')
const ipfsBinaryPath = require('path').join(__dirname, '..', 'bin', 'ipfs')
const fs = require('fs')
const {URL} = require('url')

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

// edit ipfs config to remove gateway on port 8080 because it conflicts with proxy
execSync(`${ipfsBinaryPath} config --json Addresses.Gateway null`, {stdio: 'inherit'})

// start ipfs daemon
const ipfsProcess = exec(`${ipfsBinaryPath} daemon --enable-pubsub-experiment`)
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
  proxyReq.removeHeader('X-Forwarded-Proto')
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
    debugProxy(new Date().toISOString(), req.method, req.url, req.rawHeaders)

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
// listen on port 8080 because sometimes port 80 doesn't work
startServer(8080)
startServer(80)
