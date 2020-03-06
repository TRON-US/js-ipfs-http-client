'use strict'
const ndjson = require('iterable-ndjson')
const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')
const { toFormData } = require('./form-data')
const toCamel = require('../lib/object-to-camel')
const crypto = require('libp2p-crypto')

var toPrivKey = function (privateKey) {
  var encodedPrivKey = btoa(privateKey)
  var privKeyPromise = await crypto.keys.unmarshalPrivateKey(encodedPrivKey)
  return privKeyPromise
}

module.exports = configure(({ ky }) => {
  return async function * sign (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)

    if (input.SessionId) searchParams.set("arg", searchParams.SessionId)
    if (input.PeerId) searchParams.set("arg", searchParams.PeerId)
    searchParams.set("arg", Date.now().valueOf())
    if (input.PeerId && input.Hash) searchParams.set("arg" , getSessionSignature(input.PeerId, input.SessionId, input.Hash))
    searchParams.set("arg", input.ledgerPublicKey)
    if (input.SessionStatus) searchParams.set("arg", options.SessionStatus)

    //sign the public key
    let utf8Encode = new TextEncoder()
    let privateKey = toPrivKey(input.PrivateKey)
    let privateKeyRaw = privateKey.bytes
    let publicKeyRaw = privateKeyRaw.public.bytes
    let ledgerPublicKey = JSON.stringify({Key: publicKeyRaw})
    let ledgerPublicKeyEncoded = utf8Encode.encode(ledgerPublicKey)
    let sig = privateKey.sign(ledgerPublicKeyEncoded)
    let lgSignedPubKey = JSON.stringify({Key: ledgerPublicKeyEncoded, Signature: sig})

    searchParams.set("arg", lgSignedPubKey)

    let res
    try {
      res = await ky.post('storage/upload/sign', {
        timeout: options.timeout,
        signal: options.signal,
        headers: options.headers,
        searchParams
      }).json()
    }
    catch (e) {
    }

    return {}
  }
})
