require('util').inspect.defaultOptions.depth = null
require('dotenv').config()
const fetch = require('node-fetch')
const ethers = require('ethers')
const htmlToText = require('html-to-text')
const {default: PQueue} = require('p-queue')

const gatewayUrl = 'https://ipfsgateway.xyz'

const precacheGateway = async () => {
  const subplebbits = await fetchJson(
    'https://raw.githubusercontent.com/plebbit/temporary-default-subplebbits/master/subplebbits.json',
    {cache: 'no-cache'}
  )
  console.log(`start precaching ${subplebbits.length} subplebbits`)

  const queue = new PQueue({concurrency: 5})
  for (const {address} of subplebbits) {
    queue.add(() => precacheSubplebbit(address).catch(e => console.log(e.message)))
  }
  await queue.onIdle()

  console.log(`precached ${subplebbits.length} subplebbits`)
}

const precacheSubplebbit = async (address) => {
  console.log(`subplebbit '${address}' start precaching`)
  let ipnsName = address
  if (ipnsName.endsWith('.eth')) {
    ipnsName = await resolveEnsSubplebbitAddress(ipnsName)
  }

  // precache subplebbit
  let subplebbit
  try {
    subplebbit = await fetchJson(`${gatewayUrl}/ipns/${ipnsName}`)
  }
  catch (e) {
    throw Error(`failed fetching subplebbit '${address}': ${e.message}`)
  }

  // add the preloaded pages
  const pages = Object.values(subplebbit.posts?.pages || {})

  // precache pages
  const pageCids = new Set(Object.values(subplebbit.posts?.pageCids || {}))
  const fetchPagePromises = []
  for (const pageCid of pageCids) {
    fetchPagePromises.push(async () => {
      try {
        const page = await fetchJson(`${gatewayUrl}/ipfs/${pageCid}`)
        pages.push(page)
      }
      catch (e) {
        console.log(`failed fetching subplebbit '${address}' page: ${e.message}`)
      }
    })
  }
  await Promise.all(fetchPagePromises)
  console.log(`subplebbit '${address}' precached ${pageCids.size} page cids`)

  // find all post cids
  const postCids = new Set()
  for (const page of pages) {
    for (const comment of page.comments) {
      postCids.add(comment?.update?.cid)
    }
  }

  // precache all posts
  const queue = new PQueue({concurrency: 10})
  let successCount = 0
  for (const postCid of postCids) {
    queue.add(async () => {
      try {
        // console.log(`start fetching subplebbit '${address}' post '${postCid}'`)
        const post = await fetchJson(`${gatewayUrl}/ipfs/${postCid}`)
        if (post.ipnsName) {
          const commentUpdate = await fetchJson(`${gatewayUrl}/ipns/${post.ipnsName}`)
          // console.log({post, commentUpdate})
        }
        successCount++
      }
      catch (e) {
        console.log(`failed fetching subplebbit '${address}' post: ${e.message}`)
      }
    })
  }
  await queue.onIdle()

  console.log(`subplebbit '${address}' precached ${pages.length} pages and ${successCount}/${postCids.size} posts`)
}

const fetchJson = async (url, options) => {
  let res, text, json
  try {
    res = await fetch(url, options)
    text = await res.text()
    json = JSON.parse(text)
  }
  catch (e) {
    let message = `failed fetching '${url}'`
    if (res?.status) {
      message += `: ${res.status} ${res.statusText}`
    }
    if (text) {
      try {
        text = htmlToText.convert(text)
        text = text.replaceAll('\n', ' ')
      }
      catch (e) {}
      message += `: ${text.slice?.(0, 300)}`
    }
    throw Error(message)
  }
  return json
}

const resolveEnsSubplebbitAddress = async (ensName) => {
  let ethProvider
  if (process.env.ETH_PROVIDER_URL) {
    ethProvider = new ethers.JsonRpcProvider(process.env.ETH_PROVIDER_URL)
  }
  else {
    ethProvider = ethers.getDefaultProvider()
  }
  const resolver = await ethProvider.getResolver(ensName)
  if (!resolver) {
    throw Error(`ethProvider.getResolver returned '${resolver}', can't get text record`)
  }
  const txtRecordResult = await resolver.getText('subplebbit-address')
  return txtRecordResult
}

precacheGateway().catch(e => console.log(e.message))
setInterval(() => {
  precacheGateway().catch(e => console.log(e.message))
}, 1000 * 60 * 5)
