const fetch = require('node-fetch')
const debugGateway = require('debug')('pubsub-provider:ipfs-gateway')

const maxSize = 1048576

const plebbitErrorMessage = 'this ipfs gateway only serves plebbit content'
const timeoutStatus = 504
const timeoutStatusText = 'Gateway Timeout'

const ipfsApiUrl = 'http://127.0.0.1:5001/api/v0'

const proxyIpfsGateway = async (proxy, req, res) => {
  debugGateway(req.method, req.url, req.rawHeaders)

  // fix error 'has been blocked by CORS policy'
  res.setHeader('Access-Control-Allow-Origin', '*')

  let cid, ipnsName, isIpns
  // is subdomain cid gateway request
  if (req.url === '/') {
    const split = req.headers.host.split('.', 2)
    isIpns = split[1] === 'ipns'
    cid = !isIpns ? split[0] : undefined
    ipnsName = isIpns ? split[0] : undefined  
  }
  // is regular gateway request
  else {
    const split = req.url.split('/')
    isIpns = split[1] === 'ipns'
    cid = !isIpns ? split[2] : undefined
    ipnsName = isIpns ? split[2] : undefined  
  }

  let fetched, text, error, json
  try {
    if (isIpns) {
      const fetched = await fetchWithTimeout(`${ipfsApiUrl}/name/resolve?arg=${ipnsName}`, {method: 'POST'})
      const text = await fetched.text()
      cid = JSON.parse(text).Path.split('/')[2]
    }

    fetched = await fetchWithTimeout(`${ipfsApiUrl}/cat?arg=${cid}&length=${maxSize}`, {method: 'POST'})
    text = await fetched.text()
    json = JSON.parse(text)
  }
  catch (e) {
    error = e
  }

  debugGateway(req.method, req.headers.host, req.url, fetched?.status, fetched?.statusText, error?.message)

  // request timed out
  if (error?.message === 'request timed out') {
    res.statusCode = timeoutStatus
    res.statusText = timeoutStatusText
    res.end()
    return
  }

  // status was succeeded, but doesn't have json.signature, so is not plebbit content
  if (fetched?.status < 300 && !isPlebbitJson(json)) {
    res.statusCode = 403
    res.end(plebbitErrorMessage)
    return
  }

  // set custom cache if request is successful
  if (fetched?.status < 300) {
    if (isIpns) {
      // the ipns expires after 5 minutes (300 seconds), must revalidate if expired
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
    }
    else {
      // the ipfs is immutable, so set the cache a long time
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
  }

  proxy.web(req, res, {target: 'http://127.0.0.1:8080', headers: {'X-Forwarded-Proto': 'https'}})
}

// plebbit json either has signature or comments or allPostCount
const isPlebbitJson = (json) => true //json?.signature || json?.comments || json?.allPostCount

const maxTime = 180_000
const fetchWithTimeout = async (url, options) => {
  const AbortController = globalThis.AbortController || await import('abort-controller')

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, maxTime)

  options = {signal: controller.signal, ...options}

  try {
    const response = await fetch(url, options)
    return response
  } catch (e) {
    if (e.message === 'The user aborted a request.') {
      throw Error('request timed out')
    }
    throw (e)
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {proxyIpfsGateway}