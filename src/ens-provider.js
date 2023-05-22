const http = require('http')
const httpProxy = require('http-proxy')
require('dotenv').config()
const Debug = require('debug')
const debug = Debug('pubsub-provider:ens-provider')
Debug.enable('pubsub-provider:*')
const streamify = require('stream-array')

const chainProviderUrl = process.env.ETH_PROVIDER_URL
let chainProvider
try {
  chainProvider = new URL(chainProviderUrl)
}
catch (e) {}

const allowedMethods = new Set([
  // ethers.js sometimes calls this method
  'eth_chainId', 
  // needed to resolve domains
  'eth_call'
])
const allowedAddresses = new Set([
  // eth_chainId doesn't have a "to" field
  undefined,
  // ENS PublicResolver
  '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
  // ENSRegistryWithFallback
  '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e'
])

const plebbitErrorMessage = 'this eth rpc only serves plebbit content'
const noChainProviderUrlErrorMessage = `env variable 'ETH_PROVIDER_URL' not defined`

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

  // fix bug where path name has extra / added after
  proxyReq.path = chainProvider.pathname
})
proxy.on('error', (e) => {
  console.error(e)
})
// proxy.on('proxyRes', (proxyRes, req, res) => {
//   console.log(proxyRes)
// })
proxy.on('upgrade', (req, socket, head) => {
  // proxy.ws(req, socket, head)
  debug('ws upgrade')
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

    if (!chainProviderUrl) {
      debug(req.method, req.url, req.headers, noChainProviderUrlErrorMessage)
      res.statusCode = 500
      res.end(noChainProviderUrlErrorMessage)
      return
    }

    let body
    let bodyChunks = []
    try {
      bodyChunks = await getBodyChunks(req)
      body = JSON.parse(bodyChunks.join(''))
    }
    catch (e) {
      debug(req.method, req.url, req.headers, 'failed parsing body')
      res.end()
      return
    }

    if (!allowedMethods.has(body.method) || !allowedAddresses.has(body.params[0]?.to)) {
      debug(req.method, req.url, req.headers, body, 'forbidden')
      res.statusCode = 403
      res.end(plebbitErrorMessage)
      return
    }

    debug(req.method, req.url, req.headers, body)

    // fix error 'has been blocked by CORS policy'
    res.setHeader('Access-Control-Allow-Origin', '*')

    // expires after 5 minutes (300 seconds), must revalidate if expired
    // ENS must not be cached for too long otherwise user can't see his changes reflected
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')

    proxy.web(req, res, {
      target: chainProviderUrl,
      // must re-stream the post body when you read it with getBodyChunks(req)
      buffer: streamify(bodyChunks),
      // the proxy changes the host to localhost without changeOrigin
      changeOrigin: true,
    })
  })
  server.on('error', console.error)
  server.listen(port)
  console.log(`proxy server listening on port ${port}`)
}
const port = 29553
startServer(port)

const getBodyChunks = (req) => new Promise((resolve, reject) => {
  let body = ''
  const chunks = []
  req.on('data', (data) => {
    body += data
    chunks.push(data)
    // Too much POST data, kill the connection!
    // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
    if (body.length > 1e6) {
      req.connection.destroy()
      return reject(Error('body too big'))
    }
  })
  req.on('end', () => {
    resolve(chunks)
  })
})

// use this function in the proxy script
const proxyEnsProvider = (proxy, req, res) => {
  proxy.web(req, res, {target: `http://localhost:${port}`})
}

module.exports = {proxyEnsProvider}