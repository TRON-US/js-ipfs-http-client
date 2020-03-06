'use strict'
const React = require('react')
const btfsClient = require('../node_modules/btfs-http-client')

var errorCount = 0

class App extends React.Component {

  constructor () {
    super()
    this.state = {
      added_file_hash: null,
      added_session_id:  null,
      added_session_status: null,
      added_session_contracts: null,
      added_status_response: null,
    }

    this.btfs = btfsClient('/ip4/127.0.0.1/tcp/5001')

    // bind methods
    this.captureFile = this.captureFile.bind(this)
    this.saveToIpfs = this.saveToIpfs.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)

    //offline signing
    this.upload = this.upload.bind(this)
    this.displayStatus = this.displayStatus.bind(this)
    this.signbatch = this.signbatch.bind(this)
    this.sign = this.sign.bind(this)
    this.getbatch = this.getbatch.bind(this)
    this.getunsigneddata = this.getunsigneddata.bind(this)
    this.loadKeysSubmit = this.loadKeysSubmit.bind(this)

    this.statusTimer = null
    this.time = Date.now()
    this.stateTimer = null

  }

  addStatus(status) {
    let div = document.getElementById('contractStatus')
      if (this.state.added_status_response != null){
          div.innerHTML += "<h3>".concat(status).concat(": ").concat(this.state.added_status_response).concat("</h3>")
      }else {
          div.innerHTML += "<h3>".concat(status).concat("</h3>")
      }
  }

  upload(event) {
    let input = {
      Hash: this.state.added_file_hash,
      TimeNonce: this.time.toString()
    }
    console.log("Here is the hash of the file :" + this.state.added_file_hash)
    this.btfs.upload( input , { "s": `16Uiu2HAmRfbc8E4ungNn3FWqhrKVbXotRLNk8fodgpcUeUP6nw83,16Uiu2HAmRfbc8E4ungNn3FWqhrKVbXotRLNk8fodgpcUeUP6nw83` })
        .then((response) => {
          console.log("Here is the session id of the upload data: " + response[0].ID)
          this.state.added_session_id = response[0].ID
        }).catch((err) => {
      console.error(err)
    })
    //create a timer to get the current status every 1000
    this.displayStatus(event)
  }

  getStatus(event) {
    console.log("Here is the session id:" + this.state.added_session_id)
    this.btfs.statusSign(this.state.added_session_id, {}).then(
        (response) => {
          this.state.added_session_status = response[0].Status
          this.state.added_status_response =  response[0].Message
            console.log(response[0])
        }).catch((err) => {
          console.error(err)
        }
    )
  }

  sign(event, data) {
    let input  = {
      SessionId: this.state.added_session_id,
      SessionStatus: this.state.added_session_status,
      Hash: this.state.added_file_hash,
      Unsigned: data,
      TimeNonce: this.time
    }
    this.btfs.sign(input, {})
        .then((response) => {
          console.log("Here is the response of sign: " + response)
        }).catch((err) => {
      console.error(err)
    })
  }

  signbatch(event, contracts) {
    let input  = {
      SessionId: this.state.added_session_id,
      SessionStatus: this.state.added_session_status,
      Hash: this.state.added_file_hash,
      Contracts: contracts,
      TimeNonce: this.time.toString()
    }
    this.btfs.signBatch(input, {"offline-sign-mode" : true })
        .then((response) => {
          console.log("Here is the response of signbatch: " + response[0])
        }).catch((err) => {
      console.error(err)
    })
  }

  getbatch(event) {
    let input  = {
      SessionId: this.state.added_session_id,
      SessionStatus: this.state.added_session_status,
      Hash: this.state.added_file_hash,
      TimeNonce: this.time
    }
    this.btfs.getContracts(input, {})
        .then((response) => {
          var Contract
          var Key
          for ( var index = 0 ; index <   (response[0]).Contracts.length ; index++ ){

            Contract = response[0].Contracts[index].contract
            Key = response[0].Contracts[index].key
            console.log("Here is the response of getbatch key: "+ index + " " + Key)
            console.log("Here is the response of getbatch contract: " + index + " " + Contract)
          }
          input.Contracts = (response[0]).Contracts
          this.btfs.signBatch(input, {} , {})
        }).catch((err) => {
      console.error(err)
    })
  }

    getunsigneddata(event) {
    let input  = {
        SessionId: this.state.added_session_id,
        SessionStatus: this.state.added_session_status,
        Hash: this.state.added_file_hash,
        TimeNonce: this.time
    }
        this.btfs.getUnsigned(input, {})
        .then((response) => {
            console.log("Here is the response of getunsigneddata: " + response[0].Unsigned)
            input.Unsigned = response[0].Unsigned
            input.Opcode = response[0].Opcode
            input.Price = response[0].Price
            this.btfs.sign(input, {}, {})
        }).catch((err) => {
            console.error(err)
        })
    }

  displayStatus(event) {
    let status
    //get the status every 2 seconds
    this.statusTimer = setInterval(() => {
      this.getStatus(event)
      status = this.state.added_session_status
        if (errorCount > 9){
            //after 10 error, cancel both timers
            clearTimeout(this.statusTimer)
            clearTimeout(this.stateTimer)
        }
    }, 2000)

      //check state every 5 seconds
    this.stateTimer = setInterval(() => {
      switch (status) {
        case "uninitialized":
          //alert("Here is the signing status of the current session and session id: " + status + ":" + this.state.added_session_id)
          this.addStatus(status)
          break
        case "initSignReadyEscrow":
        case  "initSignReadyGuard":
          //alert("Here is the signing status of the current session and session id: " + status + ":" + this.state.added_session_id)
          this.addStatus(status)
          this.getbatch(event)
          break
        case "balanceSignReady":
        case "payChannelSignReady":
        case "payRequestSignReady":
        case "guardSignReady":
          this.getunsigneddata(event)
              this.addStatus(status)
              break
        case "init":
          this.addStatus(status)
          this.addStatus(status)
          break
        case "complete":
            this.addStatus(status)
          break
        case "done":
          this.addStatus(status)
          clearTimeout(this.statusTimer)
          break
        case "error":
        default:
          errorCount = errorCount + 1
          this.addStatus(status)
          break;
      }
    }, 5000)
  }

  captureFile (event) {
    event.stopPropagation()
    event.preventDefault()
    if (document.getElementById('keepFilename').checked) {
      this.saveToIpfsWithFilename(event.target.files)
    } else {
      this.saveToIpfs(event.target.files)
    }
  }

  // Example #1
  // Add file to IPFS and return a CID
  saveToIpfs (files) {
    let btfsId
    this.btfs.add([...files], { chunker : "reed-solomon-1-1-262144" })
        .then((response) => {
          console.log(response)
          btfsId = response[0].hash
          console.log(ipfsId)
          this.setState({ added_file_hash: btfsId })
        }).catch((err) => {
      console.error(err)
    })
  }

  // Example #2
  // Add file to BTFS and wrap it in a directory to keep the original filename
  saveToIpfsWithFilename (files) {
    const file = [...files][0]
    let btfsId
    const fileDetails = {
      path: file.name,
      content: file
    }
    const options = {
      wrapWithDirectory: true,
      progress: (prog) => console.log(`received: ${prog}`),
      "chunker" : "reed-solomon-1-1-262144"
    }
    this.btfs.add(fileDetails, options)
        .then((response) => {
          console.log(response)
          // CID of wrapping directory is returned last
          btfsId = response[response.length - 1].hash
          console.log(btfsId)
          this.setState({ added_file_hash: btfsId })
        }).catch((err) => {
      console.error(err)
    })
  }

  handleSubmit (event) {
    event.preventDefault()
  }

  loadKeysSubmit (event) {
    this.signPrivateKey = document.getElementById("privateKey")
    this.signPublicKey = document.getElementById("publicKey")
    this.peerId = document.getElementById("peerId")
    console.log("PrivateKey :"+ this.signPrivateKey)
    console.log("PublicKey :"+ this.signPublicKey)
    console.log("PeerId :"+ this.peerId)
  }

  render () {
    return (
        <div>
          <form id="myKeys" onSubmit={this.handleSubmit}>
          </form>
            <h2>Offline signing demonstatration</h2>
          <form id='captureMedia' onSubmit={this.handleSubmit}>
            <input type='file' onChange={this.captureFile} />
            <label htmlFor='keepFilename'><input type='checkbox' id='keepFilename' name='keepFilename' /> keep filename</label>
          </form>
          <form id='captureMedia' onSubmit={this.handleSubmit}>
            <input type='text' id='filehash' name='filehash' value={this.state.added_file_hash}/><br/>
            <button onClick={this.upload}>Upload file hash</button>
          </form>
          <br/>
          <br/>
          <div id="contractStatus">
          </div>
        </div>
    )
  }
}
module.exports = App
