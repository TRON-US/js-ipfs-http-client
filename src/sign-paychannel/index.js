'use strict'
const ndjson = require('iterable-ndjson')
const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')
const { toFormData } = require('./form-data')
const toCamel = require('../lib/object-to-camel')
const crypto = require('libp2p-crypto')
const protobuf = require('protobufjs')
const ledgerpb = require('../../../../protos/ledger.proto')

var toPrivKey = function (privateKey) {
  var encodedPrivKey = btoa(privateKey)
  var privKeyPromise = await crypto.keys.unmarshalPrivateKey(encodedPrivKey)
  return privKeyPromise
}

module.exports = configure(({ ky }) => {
  return async function * sign (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)

    let channelCommit
    let chanCommit
    let bytesSignedChannelCommit

    if (input.SessionId) searchParams.set("arg", searchParams.SessionId)
    if (input.PeerId) searchParams.set("arg", searchParams.PeerId)
    searchParams.set("arg", Date.now().valueOf())
    if (input.PeerId && input.Hash) searchParams.set("arg" , getSessionSignature(input.PeerId, input.SessionId, input.Hash))
    if (input.SessionStatus) searchParams.set("arg", options.SessionStatus)

    protobuf.load(ledgerpb).then(function(root){
      var channelCommitType = root.lookupType("ChannelCommit")
      var signedChannelType = root.lookupType("SignedChannelCommit")
      var publicKeyPayer = root.lookupType("PublicKey").create({key:""})
      var recipient = root.lookupType("PublicKey").create({key:""})
      var chanCommit = channelCommitType.create({amount: "1000", payerId: Date.now().valueOf(), payer: publicKeyPayer, recipient: recipient })
      bytesSignedChannelCommit = signedChannelType.encode(signedChannelType.create({channel: chanCommit, signature: buyerChanSign})).finish()
    })

    searchParams.set("args", bytesSignedChannelCommit.toString())

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
