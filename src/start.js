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
// proxy.on('proxyReq', (proxyReq, req, res, options) => {
  // console.log('proxy request', proxyReq)
// })
proxy.on('error', (e) => {
  console.error(e)
})

const getPubsubTopic = (req) => {
  try {
    return new URL('http://localhost' + req.url).searchParams.get('arg')
  }
  catch (e) {}
}

// start server
const startServer = (port) => {
  const server = http.createServer()
  server.keepAliveTimeout = 0
  server.on('request', async (req, res) => {
    debugProxy(new Date().toISOString(), req.method, req.url, req.rawHeaders, req.body)
    if (!req.url.startsWith('/api/v0/pubsub/pub') && !req.url.startsWith('/api/v0/pubsub/sub')) {
      debugProxy(`bad url '${req.url}' 403`)
      res.statusCode = 403
      res.end()
      return
    }
    // const pubsubTopic = getPubsubTopic(req)
    proxy.web(req, res, {target: 'http://localhost:5001'})
  })
  server.on('error', console.error)
  server.listen(port)
  console.log(`proxy server listening on port ${port}`)
}
// listen on port 8080 because sometimes port 80 doesn't work
startServer(8080)
startServer(80)
