var augmentPlayer = require('./augment-player')
var createAudioContext = require('./audio-context')

module.exports = createBufferSource
function createBufferSource (src, opt) {
  if (typeof src !== 'string') {
    reject(new TypeError('Buffered source currently must be a single file'))
  }

  opt = opt || {}
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createBufferSource()

  if (opt.loop) {
    node.loop = true
  }

  return fetch(src)
    .then(checkStatus)
    .then(parseArrayBuffer)
    .then(decode)
    .then(getPlayer)
    .catch(catchError)

  function catchError (err) {
    reject(err);
  }

  function checkStatus (response) {
    if (response.status >= 200 && response.status < 300) {
      return response
    } else {
      var error = new Error(response.statusText)
      error.response = response
      throw error
    }
  }

  function decode (arrayBuf) {
    return new Promise(function(resolve, reject) {
      audioContext.decodeAudioData(arrayBuf, function (buffer) {
        resolve(buffer)
      }, function decodeError () {
        var err = new Error('Error decoding audio data')
        err.type = 'DECODE_AUDIO_DATA'
        reject(err)
      })
    });
  }

  function getPlayer (buffer) {
    node.buffer = buffer

    return augmentPlayer({
      context: audioContext,
      isBuffer: true,
      node: node,
      source: buffer,
      pause: node.stop.bind(node, 0),
      play: node.start.bind(node, 0)
    })
  }

  function parseArrayBuffer (response) {
    return response.arrayBuffer()
  }
}
