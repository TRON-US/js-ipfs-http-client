'use strict'

const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')
const toCamel = require('../lib/object-to-camel')
const config = require('../../config')
const protoGuard = require('../../protos/guard_pb')
const protoEscrow = require('../../protos/escrow_pb')
const peerId = require('peer-id')

var signContract = function (contract, sessionStatus) {
  return new Promise(   async (resolve, reject) => {
      var by = Buffer.from(contract,'base64') // contract in string <- 1. OK
      const id = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64'))
      let raw
      if (sessionStatus == 'initSignReadyEscrow'){
          raw = proto.escrow.EscrowContract.deserializeBinary(by).serializeBinary()
      }
      else if (sessionStatus == 'initSignReadyGuard') {
          raw = proto.guard.ContractMeta.deserializeBinary(by).serializeBinary()
      }
     const signature = await id.privKey.sign(Buffer.from(raw,'base64'))
     var signC = (signature.toString('base64'))
     resolve(signC);
  });
}

function sessionSignature(hash, time) {
  return config.PeerID + ":" + hash.toString() + ":" + time.toString()
}

module.exports = configure(({ ky }) => {
  return async function * signbatch (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams()
      
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key

    searchParams.append("arg", input.SessionId)
    searchParams.append("arg", config.PeerID)
    searchParams.append("arg", input.TimeNonce)
    searchParams.append("arg" ,  await idPriv.privKey.sign(Buffer.from(sessionSignature(input.Hash, input.TimeNonce))))
    searchParams.append("arg", input.SessionStatus)

    var contracts = input.Contracts

    //check the existance of private key
    if (config.PrivKey != null) {
      //get contracts from input
      for (var i = 0 ; i < contracts.length ; i++) {
          input.Contracts[i].contract = await signContract(input.Contracts[i].contract, input.SessionStatus);
      }
      //add signed contracts to the searchParams
      searchParams.append("arg", JSON.stringify(input.Contracts))

      let res
      res = await ky.post('storage/upload/signcontractbatch', {
        timeout: options.timeout,
        signal: options.signal,
        headers: options.headers,
        searchParams: searchParams
      })
      yield res
    }
  }
})
