const {execSync, exec} = require('child_process')
const ipfsBinaryPath = require('path').join(__dirname, '..', 'bin', 'ipfs')
const fs = require('fs-extra')
const path = require('path')
const logFolderPath = path.resolve(__dirname, '..', 'logs')
const assert = require('assert')
const waitOn = require('wait-on')
const debugLogs = require('debug')('pubsub-provider:logs')
const cborg = require('cborg')
const {toString} = require('uint8arrays/to-string')
const IpfsHttpClient = require('ipfs-http-client')
const ipfsClient = IpfsHttpClient.create({url: 'http://localhost:5001/api/v0'})

const subplebbits = [
  {
    "title": "Test sub",
    "address": "12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu"
  },
  {
    "title": "Plebbit Token",
    "address": "plebtoken.eth"
  },
  {
    "title": "Plebbit Lore",
    "address": "pleblore.eth"
  },
  {
    "title": "/pol/",
    "address": "politically-incorrect.eth"
  },
  {
    "title": "/biz/",
    "address": "business-and-finance.eth"
  },
  {
    "address": "movies-tv-anime.eth"
  },
  {
    "address": "videos-livestreams-podcasts.eth"
  },
  {
    "address": "health-nutrition-science.eth"
  },
  {
    "address": "censorship-watch.eth"
  },
  {
    "address": "reddit-screenshots.eth"
  },
  {
    "address": "plebbit-italy.eth"
  },
  {
    "title": "Thrifty Plebs",
    "address": "12D3KooWLiXLKwuWmfzwTRtBasTzDQVNagv8zU63eCEcdw2dT4zB"
  },
  {
    "title": "Plebs Helping Plebs",
    "address": "plebshelpingplebs.eth"
  },
  {
    "title": "Pleb Whales",
    "address": "plebwhales.eth"
  }
]

fs.ensureDirSync(logFolderPath)

const writeLog = async (subplebbitAddress, log) => {
  const timestamp = new Date().toISOString().split('.')[0]
  const date = timestamp.split('T')[0]
  const logFilePath = path.resolve(logFolderPath, subplebbitAddress, date)
  // try to parse message and delete useless fields
  try {
    const message = cborg.decode(log)
    delete message.encryptedPublication
    delete message.encryptedChallenges
    delete message.encryptedChallengeAnswers
    delete message.acceptedChallengeTypes
    delete message.protocolVersion
    delete message.signature
    try {
      message.challengeRequestId = toString(message.challengeRequestId, 'base58btc')
    }
    catch (e) {}
    // sort the json props so they are easier to read in the logs
    const sorted = {}
    sorted.type = message.type
    sorted.challengeRequestId = message.challengeRequestId
    log = JSON.stringify({...sorted, ...message})
    debugLogs(subplebbitAddress, log)
  }
  catch (e) {
    try {log = toString(log)} catch (e) {}
    debugLogs(e, log?.substring?.(0, 200))
  }
  await fs.appendFile(logFilePath, `${timestamp} ${log}\r\n\r\n`)
}

const pubsubLog = async (subplebbit) => {
  assert(subplebbit?.address)
  const onMessage = (message) => writeLog(subplebbit?.address, message?.data)
  await ipfsClient.pubsub.subscribe(subplebbit?.address, onMessage)
}

// start logging, after IPFS daemon is open
waitOn({resources: ['http://localhost:5001/webui']}).then(async () => {
  for (const subplebbit of subplebbits) {
    fs.ensureDirSync(path.resolve(logFolderPath, subplebbit.address))
    await pubsubLog(subplebbit)
    debugLogs('logging', subplebbit)
  }
})

// start server
const port = 49302
const express = require('express')
const server = express()
const serveIndex = require('serve-index')
// make sure directories can be listed
server.use('/logs', serveIndex(logFolderPath, {'icons': true}))
// make sure files can be viewed in the browser
const setHeaders = (res, path) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
}
server.use('/logs', express.static(logFolderPath, {setHeaders, cacheControl: false}))
server.listen(port)

// use this function in the proxy script
const proxyLogs = (proxy, req, res) => {
  proxy.web(req, res, {target: `http://localhost:${port}`})
}

module.exports = {proxyLogs}
