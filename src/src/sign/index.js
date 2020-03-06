'use strict'
const ndjson = require('iterable-ndjson')
const configure = require('../lib/configure')
const toCamel = require('../lib/object-to-camel')
const config = require('../../../../config.json')
const protoGuard = require('../../../../protos/guard_pb')
const protoEscrow = require('../../../../protos/escrow_pb')
const protoLedger = require('../../../../protos/ledger_pb')
const peerId = require('peer-id')
var BigInteger = require('bigi')
var EC = require('elliptic').ec

function bnToBuf(bn) {
  var hex = BigInt(bn).toString(16);
  if (hex.length % 2) { hex = '0' + hex; }
  var len = hex.length / 2;
  var u8 = new Uint8Array(len);
  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j+2), 16);
    i += 1;
    j += 2;
  }
  return u8;
}

function rawFullPrivKey(privKey) {
  var ec = new EC('secp256k1')
  const key = ec.keyFromPrivate(privKey, 'bytes')
  const pubkey = key.getPublic();
  const x =  bnToBuf(pubkey.x.toString());
  const y =  bnToBuf(pubkey.y.toString());
  var publicKey = Buffer.concat([new Buffer([0x04]), new Buffer(x.slice(0,32)), new Buffer(y)])
  return publicKey
}

function rawFullPubKey(pubKey) {
  var ec = new EC('secp256k1')
  const key = ec.keyFromPublic(pubKey, 'bytes')
  const pubkey = key.getPublic();
  const x =  bnToBuf(pubkey.x.toString());
  const y =  bnToBuf(pubkey.y.toString());
  var publicKey = Buffer.concat([new Buffer([0x04]), new Buffer(x.slice(0,32)), new Buffer(y)])
  return publicKey
}

var signBalanceContract = function () {
  return new Promise(   async (resolve, reject) => {
    const id = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key
    var pubKeyBytes = id._pubKey._key //get byte array of public key
    var lgPubKeyBuffer = new proto.ledger.PublicKey().setKey(pubKeyBytes).serializeBinary()
    var signature = await id.privKey.sign(lgPubKeyBuffer) //sign the public key
    var rawlgSignedPubKey = new proto.ledger.SignedPublicKey().setSignature(signature.toString('base64')).setKey(new proto.ledger.PublicKey().setKey(pubKeyBytes))
    var signedPubKeyBinary = rawlgSignedPubKey.serializeBinary()  //marshal ledgerSignedPublicKey into bytes -> signedBytes
    resolve (signedPubKeyBinary)
  });
}

var signPayChanContract = function (unsigned, totalPrice) {
  return new Promise(   async (resolve, reject) => {
    const cryptoKeys = require('libp2p-crypto/src/keys')
    const cryptoKeysSEC = require('libp2p-crypto-secp256k1')
    const libp2pCrypto = require('libp2p-crypto')

    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key
    var pubKeyBytes = idPriv._pubKey.bytes //get byte array of public key

    var unsignedBytes = Buffer.from(unsigned, "base64")//unsignedBytes, err := stringToBytes(unsignedData.Unsigned, Base64)
    var escrowPubKey = await peerId.createFromPubKey(unsignedBytes) //escrowPubKey, err := ic.UnmarshalPublicKey(unsignedBytes)
    const pubKey = await cryptoKeys.unmarshalPublicKey(escrowPubKey._pubKey.bytes,cryptoKeys.keysPBM.KeyType.Secp256k1)
    var toAddress = rawFullPubKey(pubKey._key)

    //const pubKeyObj = await cryptoKeysSEC().unmarshalSecp256k1PublicKey(escrowPubKey)
    var buyerPubKey = await peerId.createFromPubKey(pubKeyBytes) //get the private key//buyerPubKey, err := crypto.ToPubKey(utils.PublicKey)

    //var bPubKey = await cryptoKeys.unmarshalPublicKey(idPriv._pubKey.bytes)
    var fromAddress = rawFullPrivKey(idPriv.privKey._key)
    //var toAddress = escrowPubKey._pubKey.bytes
    var mSecTime = new Date().getTime() //need miniseconds ??
    var fromPublicKey = new proto.ledger.PublicKey().setKey(fromAddress)
    var toPublicKey = new proto.ledger.PublicKey().setKey(toAddress)
    var channelCommit =  new proto.ledger.ChannelCommit().setAmount(totalPrice).setPayerId(mSecTime).setPayer(fromPublicKey).setRecipient(toPublicKey)
    var buyerPrivKey = idPriv.privKey //buyerPrivKey, err := crypto.ToPrivKey(utils.PrivateKey)
    var buyerChanSign = await buyerPrivKey.sign(channelCommit.serializeBinary().buffer)//buyerChanSig, err := crypto.Sign(buyerPrivKey, chanCommit)
    var signedChanCommit = new proto.ledger.SignedChannelCommit().setChannel(channelCommit).setSignature(buyerChanSign)
    var signedChanCommitBytes = signedChanCommit.serializeBinary() //signedChanCommitBytes, err := proto.Marshal(signedChanCommit)
    resolve (signedChanCommitBytes)
  });
}
function bytesToString(signedBytes) {
  return btoa(String.fromCharCode.apply(null, signedBytes))
}
var signPayRequestContract = function (unsigned) {
  return new Promise(   async (resolve, reject) => {
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key
    var unsignedBytes = Buffer.from(unsigned, 'base64')
    var result = proto.escrow.SignedSubmitContractResult.deserializeBinary(unsignedBytes)
    var buyerChannelState = result.getResult().getBuyerChannelState()
    var signature = await idPriv.privKey.sign(buyerChannelState.getChannel().serializeBinary())
    //chanState.FromSignature = sig
    buyerChannelState.setFromSignature(signature)

    // STANZA IS OK
    //payerPubKey, _ := crypto.ToPubKey(utils.PublicKey)
    //raw, err := ic.RawFull(payerPubKey)
    var pubKeyBytes = idPriv._pubKey.bytes //get byte array of public key
    var payerPubKey = await peerId.createFromPubKey(pubKeyBytes) //get the private key//buyerPubKey, err := crypto.ToPubKey(utils.PublicKey)
    var rawFull = rawFullPubKey(payerPubKey._pubKey._key)

    /*
        payinReq := &escrowpb.PayinRequest{
            PayinId:           result.Result.PayinId,
            BuyerAddress:      raw,
            BuyerChannelState: chanState,
        }
    */
    var payInRequest = proto.escrow.PayinRequest.deserializeBinary()
        .setPayinId(result.getResult().getPayinId()).setBuyerAddress(rawFull).setBuyerChannelState(buyerChannelState)
    //payinSig, err := crypto.Sign(privKey, payinReq)
    var payinSig = await idPriv.privKey.sign(payInRequest.serializeBinary())

    /*
    signedPayinReq := &escrowpb.SignedPayinRequest{
			Request:        payinReq,
			BuyerSignature: payinSig,
		}
     */
    var signedPayinReq = proto.escrow.SignedPayinRequest.deserializeBinary().setRequest(payInRequest).setBuyerSignature(payinSig)
    //signedPayinReqBytes, err := proto.Marshal(signedPayinReq)
    var signedPayinReqBytes = signedPayinReq.serializeBinary()
    resolve(signedPayinReqBytes)
  });
}

var signGuardSignContract = function (unsigned, sessionStatus,) {
  return new Promise(   async (resolve, reject) => {
    var unsignedBytes = Buffer.from(unsigned, "base64")
    var meta = proto.guard.FileStoreMeta.deserializeBinary(unsignedBytes)
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key
    var signed = await idPriv.privKey.sign(meta.serializeBinary())
    resolve (signed)
  });
}

function sessionSignature (hash, time) {
  return config.PeerID + ":" + hash.toString() + ":" + time.toString()
}

module.exports = configure(({ ky }) => {
  return async function* sign(input, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)
    const idPriv = await peerId.createFromPrivKey(Buffer.from(config.PrivKey, 'base64')) //get the private key

    searchParams.append("arg", input.SessionId)
    searchParams.append("arg", config.PeerID)
    searchParams.append("arg", input.TimeNonce)
    searchParams.append("arg", await idPriv.privKey.sign(Buffer.from(sessionSignature(input.Hash, input.TimeNonce))))

    //sign input here with private key
    if (config.PrivKey != null) {

      //get contracts from input
      var unsigned = input.Unsigned
      let signedBytes

      switch (input.Opcode) {
        case "balance" :
          //sign contract
          signedBytes = await signBalanceContract()
          break
        case "paychannel" :
          signedBytes = await signPayChanContract(unsigned,input.Price)
          break
        case "payrequest" :
          signedBytes = await signPayRequestContract(unsigned)
          break
        case "guard":
          signedBytes = await signGuardSignContract(unsigned)
          break
      }

      //add signed contracts to the searchParams
      searchParams.append("arg", btoa(String.fromCharCode.apply(null, signedBytes)))
      searchParams.append("arg", input.SessionStatus)

      let res
      yield res = await ky.post('storage/upload/sign', {
        timeout: options.timeout,
        signal: options.signal,
        headers: options.headers,
        searchParams
      })
      yield res
    }
  }
})
