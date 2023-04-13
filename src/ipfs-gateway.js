const fetch = require('node-fetch')
const debugGateway = require('debug')('pubsub-provider:ipfs-gateway')

const maxSize = 1048576

const plebbitErrorMessage = 'this ipfs gateway only serves plebbit content'
const timeoutStatus = 504
const timeoutStatusText = 'Gateway Timeout'

const ipfsApiUrl = 'http://localhost:5001/api/v0'

const proxyIpfsGateway = async (proxy, req, res) => {
  debugGateway(req.method, req.url, req.rawHeaders)

  // fix error 'has been blocked by CORS policy'
  res.setHeader('Access-Control-Allow-Origin', '*')

  const split = req.url.split('/')
  const isIpns = split[1] === 'ipns'
  let cid = !isIpns ? split[2] : undefined

  let fetched, text, error, json
  try {
    if (isIpns) {
      const ipnsName = split[2]
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

  debugGateway(req.method, req.url, fetched?.status, fetched?.statusText, error?.message)

  // request timed out
  if (error?.message === 'The user aborted a request.') {
    res.statusCode = timeoutStatus
    res.statusText = timeoutStatusText
    res.end()
    return
  }

  // status was succeeded, but doesn't have json.signature, so is not plebbit content
  if (fetched?.status < 300 && !json?.signature) {
    res.statusCode = 403
    res.end(plebbitErrorMessage)
    return
  }

  if (isIpns) {
    // the ipns expires after 5 minutes (300 seconds), must revalidate if expired
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
  }
  else {
    // the ipfs is immutable, so set the cache a long time
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
  proxy.web(req, res, {target: 'http://localhost:8080'})
}

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
  } catch (error) {
    throw (error)
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {proxyIpfsGateway}
