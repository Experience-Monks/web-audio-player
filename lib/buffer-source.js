var createAudioContext = require('./audio-context')
var xhr = require('xhr')
var xhrProgress = require('xhr-progress')
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

  var xhrObject = xhr({
    uri: src,
    responseType: 'arraybuffer'
  }, function (err, resp, arrayBuf) {
    if (!/^2/.test(resp.statusCode)) {
      err = new Error('status code ' + resp.statusCode + ' requesting ' + src)
    }
    if (err) {
      return emitter.emit('error', err)
    }
    decode(arrayBuf)
  })

  xhrProgress(xhrObject)
    .on('data', function (amount, total) {
      emitter.emit('progress', amount, total)
    })

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

  function decode (arrayBuf) {
    emitter.emit('decoding')
    audioContext.decodeAudioData(arrayBuf, function (buffer) {
      node.buffer = buffer
      emitter.emit('load')
    }, function (err) {
      emitter.emit('error', err)
    })
  }

  function ended () {
    emitter.emit('end')
  }
}
