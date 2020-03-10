'use strict'

require('iterable-ndjson')
const configure = require('../lib/configure')

module.exports = configure(({ ky }) => {
  return async function * status (input, options) {
    options = options || {}

    const searchParams = new URLSearchParams()

    searchParams.set("arg",input.SessionId)

    var res = await ky.post( 'storage/upload/status', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams: searchParams
    }).json()

    yield res
  }
})
