const http = require('http')
const httpProxy = require('http-proxy')
const Debug = require('debug')
const debugProxy = require('debug')('pubsub-provider:proxy')
const debugIpfs = require('debug')('pubsub-provider:ipfs')
Debug.enable('pubsub-provider:*')
const {execSync, exec} = require('child_process')
const ipfsBinaryPath = require('path').join(__dirname, 'ipfs')
const ipfsConfigPath = require('path').join(__dirname, 'ipfs-config.json')
const fs = require('fs')

// init ipfs binary
try {
  execSync(`${ipfsBinaryPath} init`, {stdio: 'inherit'})
}
catch (e) {}

// edit ipfs config to remove gateway on port 8080 because it conflicts with proxy
const config = JSON.parse(execSync(`${ipfsBinaryPath} config show`).toString())
config.Addresses.Gateway = undefined
fs.writeFileSync(ipfsConfigPath, JSON.stringify(config))
execSync(`${ipfsBinaryPath} config replace ${ipfsConfigPath}`)
fs.rmSync(ipfsConfigPath)

// start ipfs daemon
const ipfsProcess = exec(`${ipfsBinaryPath} daemon --enable-pubsub-experiment`)
console.log(`ipfs process launched with pid ${ipfsProcess.pid}`)
ipfsProcess.stderr.on('data', console.error)
ipfsProcess.stdin.on('data', debugIpfs)
ipfsProcess.stdout.on('data', debugIpfs)
ipfsProcess.on('error', console.error)
ipfsProcess.on('exit', () => {
  console.error(`ipfs process with pid ${ipfsProcess.pid} exited`)
  process.exit(1)
})

// start proxy
const proxy = httpProxy.createProxyServer({})
// proxy.on('proxyReq', (proxyReq, req, res, options) => {
  // console.log('proxy request', proxyReq)
// })
proxy.on('error', (e) => {
  console.error(e)
})

// start server
const startServer = (port) => {
  const server = http.createServer()
  server.keepAliveTimeout = 0
  server.on('request', async (req, res) => {
    debugProxy(new Date().toISOString(), req.method, req.url, req.rawHeaders)
    if (!req.url.startsWith('/api/v0/pubsub/pub') && !req.url.startsWith('/api/v0/pubsub/sub')) {
      res.statusCode = 403
      res.end()
      return
    }
    proxy.web(req, res, {target: 'http://localhost:5001'})
  })
  server.listen(port)
  console.log(`proxy listening on port ${port}`)
}
// listen on 2 ports to be compatible with http and https on cloudflare
startServer(8080)
startServer(8443)
