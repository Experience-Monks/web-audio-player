var augmentPlayer = require('./augment-player')
var createAudio = require('simple-media-element').audio
var createAudioContext = require('./audio-context')

module.exports = createMediaSource
function createMediaSource (src, opt) {
  return new Promise(function(resolve, reject) {
    opt = opt || {}

    // default to Audio instead of HTMLAudioElement
    // https://github.com/hughsk/web-audio-analyser/pull/5
    if (!opt.element) opt.element = new window.Audio()

    var audio = createAudio(src, opt)
    var audioContext = opt.context || createAudioContext()
    var node = audioContext.createMediaElementSource(audio)

    function done() {
      resolve(augmentPlayer({
        context: audioContext,
        isBuffer: false,
        node: node,
        source: audio,
        pause: audio.pause.bind(audio, 0),
        play: audio.play.bind(audio, 0)
      }))
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
      addOnce(audio, 'error', reject)
    }

    function addOnce (element, event, fn) {
      function tmp (ev) {
        element.removeEventListener(event, tmp, false)
        fn()
      }
      element.addEventListener(event, tmp, false)
    }
  })
}
