const {execSync, exec} = require('child_process')
const ipfsBinaryPath = require('path').join(__dirname, '..', 'bin', 'ipfs')
const fs = require('fs-extra')
const path = require('path')
const logFolderPath = path.resolve(__dirname, '..', 'logs')
const assert = require('assert')
const waitOn = require('wait-on')
const debugLogs = require('debug')('pubsub-provider:logs')

const subplebbits = [
  {
    "title": "Test sub",
    "address": "12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu"
  },
  {
    "title": "Plebs Helping Plebs",
    "address": "plebshelpingplebs.eth"
  },
  {
    "title": "Pleb Whales",
    "address": "plebwhales.eth"
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
  }
]

fs.ensureDirSync(logFolderPath)

const writeLog = async (subplebbitAddress, log) => {
  const timestamp = new Date().toISOString().split('.')[0]
  const date = timestamp.split('T')[0]
  const logFilePath = path.resolve(logFolderPath, subplebbitAddress, date)
  // remove encrypted fields because they are huge and can't be read anyway
  log = log.replaceAll(/"encrypted[^}]+},/g, '')
  await fs.appendFile(logFilePath, `${timestamp} ${log}\r\n`)
}

const pubsubLog = (subplebbit) => {
  assert(subplebbit?.address)
  const ipfsProcess = exec(`${ipfsBinaryPath} pubsub sub ${subplebbit.address}`)
  ipfsProcess.stderr.on('data', data => debugLogs('stderr', data))
  ipfsProcess.stdin.on('data', data => debugLogs('stdin', data))
  // ipfsProcess.stdout.on('data', data => debugLogs('stdout', data))
  ipfsProcess.stdout.on('data', data => writeLog(subplebbit.address, data).catch(debugLogs))
  ipfsProcess.on('error', data => debugLogs('error', data))
  ipfsProcess.on('exit', () => {
    debugLogs(`ipfs process with pid ${ipfsProcess.pid} exited`)
  })
}

// start logging, after IPFS daemon is open
waitOn({resources: ['http://localhost:5001/webui']}).then(() => {
  for (const subplebbit of subplebbits) {
    fs.ensureDirSync(path.resolve(logFolderPath, subplebbit.address))
    debugLogs('logging', subplebbit)
    pubsubLog(subplebbit)
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
