'use strict'
/* eslint-env browser */

const normaliseInput = require('ipfs-utils/src/files/normalise-input')

exports.toFormData = async input => {
  const formData = new FormData()
  formData.append(`dir-${0}`, new Blob([], { type: 'application/x-directory' }), input)
  return formData
}
