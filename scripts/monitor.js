const IpfsHttpClient = require('ipfs-http-client')
const http = require('https')
const {toString} = require('uint8arrays/to-string')
const ProxyAgent = require('https-proxy-agent')
const {expect} = require('chai')

let agent = new http.Agent({keepAlive: true, maxSockets: 99999})
try {
  const proxyUrl = require('../proxy-url')
  agent = new ProxyAgent(proxyUrl)
}
catch (e) {}
const url = 'https://pubsubprovider.xyz/api/v0'
const ipfsClient = IpfsHttpClient.create({agent, url})

const timeout = 60000
const pubsubTopic = 'plebbit test'
const maxFailCount = 5
let currentFailCount = 0
const onFail = require('./monitor-on-fail')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

;(async () => {
  while (true) {
    let onMessageReceived
    messageReceivedPromise = new Promise(resolve => {
      onMessageReceived = (message) => {
        console.log(`received message from ${message.from}:`, toString(message.data))
        resolve(message)
      }
    })

    try {
      console.log('trying to subscribe to:', pubsubTopic)
      await ipfsClient.pubsub.subscribe(pubsubTopic, onMessageReceived)
      console.log('subscribed to:', pubsubTopic)

      const messageSent = pubsubTopic + ' ' + new Date().toISOString()
      console.log('trying to publish:', messageSent)
      await ipfsClient.pubsub.publish(pubsubTopic, Buffer.from(messageSent))
      console.log('published:', messageSent)

      const messageReceived = await messageReceivedPromise
      expect(messageReceived).not.to.equal(undefined)
      expect(messageReceived.from).to.be.a('string')
      expect(messageReceived.from).not.to.be.empty
      expect(toString(messageReceived.data)).to.equal(messageSent)
      await ipfsClient.pubsub.unsubscribe(pubsubTopic)
      currentFailCount = 0
    }
    catch (e) {
      console.log(e)
      console.log('current fail count:', ++currentFailCount)
      if (currentFailCount >= maxFailCount) {
        try {
          console.log('trying on fail:', new Date().toISOString())
          await onFail()
          console.log('on fail success:', new Date().toISOString())
        }
        catch (e) {
          console.log(e)
          console.log('on fail failed:', new Date().toISOString())
        }
        currentFailCount = 0
      }
    }

    console.log('waiting:', timeout, '...')
    await sleep(timeout)
  }
})()
