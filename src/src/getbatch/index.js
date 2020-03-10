'use strict'

const configure = require('../lib/configure')
const config = require('../../../../config.json')
const peerId = require('peer-id')
  
function sessionSignature(hash, time) {
  return config.PeerID + ":" + hash.toString() + ":" + time.toString()
}

module.exports = configure(({ ky }) => {
  return async function* batch(input, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key

    searchParams.append("arg", input.SessionId)
    searchParams.append("arg", config.PeerID.toString())
    searchParams.append("arg", input.TimeNonce)
    searchParams.append("arg" ,  await idPriv.privKey.sign(Buffer.from(sessionSignature(input.Hash, input.TimeNonce))))
    searchParams.append("arg", input.SessionStatus)

    const res = await ky.post('storage/upload/getcontractbatch', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    }).json()

    yield res
  }
})
