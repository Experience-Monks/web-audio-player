var createAudioContext = require('./audio-context')
var xhr = require('xhr')
var xhrProgress = require('xhr-progress')
var EventEmitter = require('events').EventEmitter
var canPlaySrc = require('./can-play-src')

module.exports = createBufferSource
function createBufferSource (src, opt) {
  opt = opt || {}
  var emitter = new EventEmitter()
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createBufferSource()
  node.onended = ended

  if (opt.loop) {
    node.loop = true
  }

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

  // filter down to a list of playable sources
  var sources = Array.isArray(src) ? src : [ src ]
  sources = sources.filter(Boolean)
  var playable = sources.some(canPlaySrc)
  if (playable) {
    // We have at least one playable source.
    // For now just play the first,
    // ideally this module could attempt each one.
    startLoad(sources.filter(canPlaySrc)[0])
  } else {
    // no sources can be played...
    process.nextTick(function () {
      emitter.emit('error', canPlaySrc.createError(sources))
    })
  }
  return emitter

  function startLoad (src) {
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
}
