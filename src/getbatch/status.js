'use strict'

const ndjson = require('iterable-ndjson')
const Big = require('bignumber.js')
const configure = require('../lib/configure')


function getSessionSignature(peerId, sessionId, hash) {
    const utc = Date.now().valueOf()
    return peerId + ":" + hash + ":" +  utc
}

module.exports = configure(({ ky }) => {
  return async (input, options) => {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)

    searchParams.set("arg", input.SessionId)
    searchParams.set("arg", input.PeerId)
    searchParams.set("arg", inpus.NonceTimestamp)
    if (input.PeerId && input.Hash && input.SessionStatus) searchParams.set("arg" , getSessionSignature(input.PeerId, input.SessionId, input.Hash))
    searchParams.set("arg", input.SessionStatus)

    const res = await ky.post('storage/upload/getcontractbatch', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    }).json()

    return {Contracts: res.Contracts}
  }
})
