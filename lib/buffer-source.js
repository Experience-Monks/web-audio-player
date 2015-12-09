var createAudioContext = require('./audio-context')
var EventEmitter = require('events').EventEmitter

module.exports = createBufferSource
function createBufferSource (src, opt) {
  if (typeof src !== 'string') {
    throw new TypeError('Buffered source currently must be a single file')
  }

  opt = opt || {}
  var emitter = new EventEmitter()
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createBufferSource()
  node.onended = ended

  if (opt.loop) {
    node.loop = true
  }

  fetch(src)
    .then(checkStatus)
    .then(parseArrayBuffer)
    .then(decode)
    .catch(catchError)

  emitter.play = node.start.bind(node, 0)
  emitter.pause = node.stop.bind(node, 0)
  emitter.node = node
  emitter.context = audioContext

  Object.defineProperties(emitter, {
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        if (node.buffer && typeof node.buffer.duration !== 'undefined') {
          return node.buffer.duration
        }
        return undefined
      }
    }
  })

  return emitter

  function catchError (err) {
    emitter.emit('error', err)
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
    emitter.emit('decoding')
    audioContext.decodeAudioData(arrayBuf, function (buffer) {
      node.buffer = buffer
      emitter.emit('load')
    }, function () {
      var err = new Error('Error decoding audio data')
      err.type = 'DECODE_AUDIO_DATA'
      emitter.emit('error', err)
    })
  }

  function ended () {
    emitter.emit('end')
  }

  function parseArrayBuffer (response) {
    return response.arrayBuffer()
  }
}
