const IpfsHttpClient = require('ipfs-http-client')
const http = require('https')
const ProxyAgent = require('https-proxy-agent')
const {expect} = require('chai')
const {getChallengeRequestIdFromPublicKey, generateSigner} = require('../src/utils/crypto')
const {encryptEd25519AesGcm} = require('../src/utils/encryption')
const {fromString: uint8ArrayFromString} = require('uint8arrays/from-string')
const {toString: uint8ArrayToString} = require('uint8arrays/to-string')
const {signBufferEd25519, verifyBufferEd25519} = require('../src/utils/signature')
const cborg = require('cborg')

let agent = new http.Agent({keepAlive: true, maxSockets: 99999})
try {
  const proxyUrl = require('../proxy-url')
  agent = new ProxyAgent(proxyUrl)
}
catch (e) {}
const url = 'https://pubsubprovider.xyz/api/v0'
const ipfsClient = IpfsHttpClient.create({agent, url})

const timeout = 60000
const maxFailCount = 5
let currentFailCount = 0
const onFail = require('./monitor-on-fail')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

;(async () => {
  const subplebbitSigner = await generateSigner()
  const pubsubTopic = subplebbitSigner.address

  while (true) {
    let onMessageReceived
    messageReceivedPromise = new Promise(resolve => {
      onMessageReceived = (message) => {
        console.log(`received message from ${message.from}:`, uint8ArrayToString(message.data).slice(0, 50))
        resolve(message)
      }
    })

    try {
      console.log('trying to subscribe to:', pubsubTopic)
      await ipfsClient.pubsub.subscribe(pubsubTopic, onMessageReceived)
      console.log('subscribed to:', pubsubTopic)

      const messageSent = await generateChallengeMessage(subplebbitSigner)
      console.log('trying to publish:', uint8ArrayToString(messageSent).slice(0, 50))
      await ipfsClient.pubsub.publish(pubsubTopic, messageSent)
      console.log('published:', uint8ArrayToString(messageSent).slice(0, 50))

      const messageReceived = await messageReceivedPromise
      expect(messageReceived).not.to.equal(undefined)
      expect(messageReceived.from).to.be.a('string')
      expect(messageReceived.from).not.to.be.empty
      expect(uint8ArrayToString(messageReceived.data)).to.equal(uint8ArrayToString(messageSent))
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

const generateChallengeMessage = async (subplebbitSigner) => {
  const authorSigner = await generateSigner()

  const challenges = [{challenge: '1+1=?', type: 'text'}]
  const encryptedChallenges = await encryptEd25519AesGcm(
    JSON.stringify(challenges),
    subplebbitSigner.privateKey,
    authorSigner.publicKey
  )
  const challengePubsubMessage = {
    type: 'CHALLENGE',
    timestamp: Math.round(Date.now() / 1000),
    challengeRequestId: await getChallengeRequestIdFromPublicKey(authorSigner.publicKey),
    encryptedChallenges,
    protocolVersion: '1.0.0',
    userAgent: `/protocol-test:1.0.0/`,
  }

  // create pubsub challenge message signature
  const challengePubsubMessageSignedPropertyNames = ['type', 'timestamp', 'challengeRequestId', 'encryptedChallenges']
  const challengePubsubMessageSignature = await sign({
    objectToSign: challengePubsubMessage,
    signedPropertyNames: challengePubsubMessageSignedPropertyNames,
    privateKey: subplebbitSigner.privateKey,
  })
  challengePubsubMessage.signature = {
    signature: uint8ArrayFromString(challengePubsubMessageSignature, 'base64'),
    publicKey: uint8ArrayFromString(subplebbitSigner.publicKey, 'base64'),
    type: 'ed25519',
    signedPropertyNames: challengePubsubMessageSignedPropertyNames,
  }

  return cborg.encode(challengePubsubMessage)
}

const getBufferToSign = (objectToSign, signedPropertyNames) => {
  const propsToSign = {}
  for (const propertyName of signedPropertyNames) {
    if (objectToSign[propertyName] !== null && objectToSign[propertyName] !== undefined) {
      propsToSign[propertyName] = objectToSign[propertyName]
    }
  }
  // console.log({propsToSign})
  const bufferToSign = cborg.encode(propsToSign)
  return bufferToSign
}

const sign = async ({objectToSign, signedPropertyNames, privateKey}) => {
  const bufferToSign = getBufferToSign(objectToSign, signedPropertyNames)
  const signatureBuffer = await signBufferEd25519(bufferToSign, privateKey)
  const signatureBase64 = uint8ArrayToString(signatureBuffer, 'base64')
  return signatureBase64
}
