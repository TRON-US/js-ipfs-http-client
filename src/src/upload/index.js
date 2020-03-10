'use strict'

const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')
const toCamel = require('../lib/object-to-camel')
const config = require('../../../../config.json')
const peerId = require('peer-id')

function sessionSignature(hash, time) {
    return config.PeerID + ":" + hash.toString() + ":" + time.toString()
}

module.exports = configure(({ ky }) => {
  return async function * upload (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams()
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key

    searchParams.append("arg", input.Hash)
    searchParams.append("arg", config.PeerID)
    searchParams.append("arg", input.TimeNonce)
    searchParams.append("arg",  await idPriv.privKey.sign(Buffer.from(sessionSignature(input.Hash, input.TimeNonce))))
    searchParams.set('m', "custom")
    searchParams.set('s', options.s.toString())

    var res = await ky.post( 'storage/upload/offline', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    }).json()

    yield {ID: res.ID}
  }
})
