const {getKeyPairFromPrivateKeyPem, getPeerIdFromPublicKeyPem} = require('./crypto')
const assert = require('assert')
const {fromString: uint8ArrayFromString} = require('uint8arrays/from-string')
const {toString: uint8ArrayToString} = require('uint8arrays/to-string')
const ed = require('@noble/ed25519')

const isProbablyBuffer = (arg) => arg && typeof arg !== 'string' && typeof arg !== 'number'

const signBufferEd25519 = async (bufferToSign, privateKeyBase64) => {
  if (!isProbablyBuffer(bufferToSign)) throw Error(`signBufferEd25519 invalid bufferToSign '${bufferToSign}' not buffer`)
  assert(privateKeyBase64 && typeof privateKeyBase64 === 'string', `signBufferEd25519 privateKeyBase64 not a string`)
  const privateKeyBuffer = uint8ArrayFromString(privateKeyBase64, 'base64')
  assert.equal(privateKeyBuffer.length, 32, `verifyBufferEd25519 publicKeyBase64 ed25519 public key length not 32 bytes (${privateKeyBuffer.length} bytes)`)
  // do not use to sign strings, it doesn't encode properly in the browser
  const signature = await ed.sign(bufferToSign, privateKeyBuffer)
  return signature
}

const verifyBufferEd25519 = async (bufferToSign, bufferSignature, publicKeyBase64) => {
  if (!isProbablyBuffer(bufferToSign)) throw Error(`verifyBufferEd25519 invalid bufferSignature '${bufferToSign}' not buffer`)
  if (!isProbablyBuffer(bufferSignature)) throw Error(`verifyBufferEd25519 invalid bufferSignature '${bufferSignature}' not buffer`)
  assert(publicKeyBase64 && typeof publicKeyBase64 === 'string', `verifyBufferEd25519 publicKeyBase64 '${publicKeyBase64}' not a string`)
  const publicKeyBuffer = uint8ArrayFromString(publicKeyBase64, 'base64')
  assert.equal(
    publicKeyBuffer.length,
    32,
    `verifyBufferEd25519 publicKeyBase64 '${publicKeyBase64}' ed25519 public key length not 32 bytes (${publicKeyBuffer.length} bytes)`
  )
  const isValid = await ed.verify(bufferSignature, bufferToSign, publicKeyBuffer)
  return isValid
}

const getBufferToSign = (objectToSign, signedPropertyNames) => {
  const propsToSign = {}
  for (const propertyName of signedPropertyNames) {
    if (objectToSign[propertyName] !== undefined && objectToSign[propertyName] !== null) {
      propsToSign[propertyName] = objectToSign[propertyName]
    }
  }
  const bufferToSign = cborg.encode(propsToSign)
  return bufferToSign
}

module.exports = {signBufferEd25519, verifyBufferEd25519}
