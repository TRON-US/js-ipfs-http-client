'use strict'
const ndjson = require('iterable-ndjson')
const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')
const { toFormData } = require('./form-data')
const toCamel = require('../lib/object-to-camel')
const protobuf = require('protobufjs')
const escrowpb = require('../../../../protos/escrow.proto')

function toByteArray(input) {
  var utf8Encode = new TextEncoder()
  var outputArray = utf8Encode.encode(input)
  return outputArray
}

var toPrivKey = function (privateKey) {
  var encodedPrivKey = btoa(privateKey)
  var privKeyPromise = crypto.keys.unmarshalPrivateKey(ecodedPrivKey)
  return privKeyPromise
}

module.exports = configure(({ ky }) => {
  return async function * sign (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)

    var unsignedData =  toByteArray(input.Unsigned)

    protobuf.load(escrowpb).then(function(root){
      var signedSubmitContractResultType = root.lookupType("SignedSubmitContractResult")
      var result = signedSubmitContractResultType.decode(unsignedData, unsignedData.length)
      var resultObj = signedSubmitContractResultType.toObject(result, {
        bytes: String
      })
      var pKey = toPrivKey(input.PrivateKey)
      let signedContract = toPrivKey(pKey).sign(resultObj).toString()

      var signedChannelType = root.lookupType("SignedChannelCommit")
      var publicKeyPayer = root.lookupType("PublicKey").create({key:""})
      var recipient = root.lookupType("PublicKey").create({key:""})
      var chanCommit = channelCommitType.create({amount: "1000", payerId: Date.now().valueOf(), payer: publicKeyPayer, recipient: recipient })
      bytesSignedChannelCommit = signedChannelType.encode(signedChannelType.create({channel: chanCommit, signature: buyerChanSign})).finish()
    })

    if (input.SessionId) searchParams.set("arg", searchParams.SessionId)
    if (input.PeerId) searchParams.set("arg", searchParams.PeerId)
    searchParams.set("arg", Date.now().valueOf())
    if (input.PeerId && input.Hash) searchParams.set("arg" , getSessionSignature(input.PeerId, input.SessionId, input.Hash))
    if (input.SessionStatus) searchParams.set("arg", options.SessionStatus)

    //sign input here with private key

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
