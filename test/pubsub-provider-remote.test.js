const IpfsHttpClient = require('ipfs-http-client')
const {toString} = require('uint8arrays/to-string')
const {Buffer} = require('buffer')
const {expect} = require('chai')

const ipfsClientUrl = 'https://pubsubprovider.xyz/api/v0'
const pubsubTopic = 'plebbit test'

describe('pubsub-provider (remote)', () => {
  let ipfsClient

  before(() => {
    ipfsClient = IpfsHttpClient.create({url: ipfsClientUrl})
  })

  it('subscribe and publish 1 client 1 topic 1 message', async () => {
    let onMessageReceived
    messageReceivedPromise = new Promise(resolve => {
      onMessageReceived = (message) => {
        console.log(`received message from ${message.from}:`, toString(message.data))
        resolve(message)
      }
    })

    await ipfsClient.pubsub.subscribe(pubsubTopic, onMessageReceived)
    const messageSent = new Date().toISOString()
    await ipfsClient.pubsub.publish(pubsubTopic, Buffer.from(messageSent))

    const messageReceived = await messageReceivedPromise
    expect(messageReceived).not.to.equal(undefined)
    expect(messageReceived.from).to.be.a('string')
    expect(messageReceived.from).not.to.be.empty
    expect(toString(messageReceived.data)).to.equal(messageSent)

    await ipfsClient.pubsub.unsubscribe(pubsubTopic)
    // await new Promise(r => null)
  })

  it('subscribe and publish 1 client multiple topics 1 message and unsub after each', async () => {
    const topics = 10
    let i =  0
    while (i++ < topics) {
      const currentPubsubTopic = pubsubTopic + i
      let onMessageReceived
      messageReceivedPromise = new Promise(resolve => {
        onMessageReceived = (message) => {
          console.log(`received message from ${message.from}:`, toString(message.data))
          resolve(message)
        }
      })

      await ipfsClient.pubsub.subscribe(currentPubsubTopic, onMessageReceived)
      const messageSent = currentPubsubTopic + ' ' + new Date().toISOString()
      await ipfsClient.pubsub.publish(currentPubsubTopic, Buffer.from(messageSent))

      const messageReceived = await messageReceivedPromise
      expect(messageReceived).not.to.equal(undefined)
      expect(messageReceived.from).to.be.a('string')
      expect(messageReceived.from).not.to.be.empty
      expect(toString(messageReceived.data)).to.equal(messageSent)
      await ipfsClient.pubsub.unsubscribe(currentPubsubTopic)
    }
    // await new Promise(r => null)
  })
})
