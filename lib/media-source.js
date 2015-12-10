var EventEmitter = require('events').EventEmitter
var createAudio = require('simple-media-element').audio
var createAudioContext = require('./audio-context')
var canPlaySrc = require('./can-play-src')
var assign = require('object-assign')

module.exports = createMediaSource
function createMediaSource (src, opt) {
  opt = assign({}, opt)
  var emitter = new EventEmitter()

  // Default to Audio instead of HTMLAudioElement
  // There is not much difference except in the following:
  //    x instanceof Audio
  //    x instanceof HTMLAudioElement
  // And in my experience Audio has better support on various
  // platforms like CocoonJS.
  // Please open an issue if there is a concern with this.
  if (!opt.element) opt.element = new window.Audio()

  var audio = createAudio(src, opt)
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createMediaElementSource(audio)

  audio.addEventListener('ended', function () {
    emitter.emit('end')
  })

  emitter.element = audio
  emitter.context = audioContext
  emitter.node = node
  emitter.play = audio.play.bind(audio)
  emitter.pause = audio.pause.bind(audio)

  Object.defineProperties(emitter, {
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.duration
      }
    },
    currentTime: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.currentTime
      }
    }
  })
  
  // Check if all sources are unplayable,
  // if so we emit an error since the browser
  // might not.
  var sources = Array.isArray(src) ? src : [ src ]
  sources = sources.filter(Boolean)

  var playable = sources.some(canPlaySrc)
  if (playable) {
    // At least one source is probably/maybe playable
    startLoad()
  } else {
    // emit error on next tick so user can catch it
    process.nextTick(function () {
      emitter.emit('error', canPlaySrc.createError(sources))
    })
  }

  return emitter

  function startLoad () {
    var done = function () {
      emitter.emit('load')
    }

    // On most browsers the loading begins
    // immediately. However, on iOS 9.2 Safari,
    // you need to call load() for events
    // to be triggered.
    audio.load()

    if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
      process.nextTick(done)
    } else {
      addOnce(audio, 'canplay', done)
      addOnce(audio, 'error', function (err) {
        emitter.emit('error', err)
      })
    }
  }

  function addOnce (element, event, fn) {
    function tmp (ev) {
      element.removeEventListener(event, tmp, false)
      fn()
    }
    element.addEventListener(event, tmp, false)
  }
}
