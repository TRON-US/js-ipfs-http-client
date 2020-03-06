'use strict'

const FormData = require('form-data')
const { Buffer } = require('buffer')
const toStream = require('it-to-stream')
const normaliseInput = require('ipfs-utils/src/files/normalise-input')
const { isElectronRenderer } = require('ipfs-utils/src/env')

exports.toFormData = async input => {
  return input
}
