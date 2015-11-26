/*eslint no-self-compare:0*/
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
    attemptDecode(arrayBuf, function (err, buffer) {
      if (err) {
        var cleaned = cleanArrayBuffer(arrayBuf)
        if (cleaned) {
          attemptDecode(cleaned, function (err, buffer) {
            if (err) emitter.emit('error', err)
            else decodeSuccess(buffer)
          })
        } else {
          emitter.emit('error', err)
        }
      } else {
        decodeSuccess(buffer)
      }
    })
  }

  function attemptDecode (arrayBuf, cb) {
    audioContext.decodeAudioData(arrayBuf, function (buffer) {
      cb(null, buffer)
    }, function () {
      var err = new Error('Error decoding audio data')
      err.type = 'DECODE_AUDIO_DATA'
      cb(err)
    })
  }

  function cleanArrayBuffer (arrayBuffer) {
    console.log("CLEANING")
    var buf8 = new Uint8Array(arrayBuffer)
    var offset = 0
    for (; offset < buf8.length; offset++) {
      offset = indexOf(buf8, 0xFF, offset)
      if (offset === -1 || (buf8[offset + 1] & 0xE0 === 0xE0)) {
        break
      }
    }
    if (offset !== -1 && offset < buf8.length) {
      return arrayBuffer.slice(offset)
    }
    return null
  }

  function indexOf (buf8, byte, start) {
    start = start || 0
    for (var i = start; i < buf8.length; i++) {
      if (buf8[i] === byte) return i
    }
    return -1
  }

  function decodeSuccess (buffer) {
    node.buffer = buffer
    emitter.emit('load')
  }

  function ended () {
    emitter.emit('end')
  }
}
