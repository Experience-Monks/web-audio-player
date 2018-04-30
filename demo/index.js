var audioPlayer = require('../')
var createApp = require('canvas-loop')
var createAnalyser = require('web-audio-analyser')
var createAudioContext = require('ios-safe-audio-context')
var detectAutoplay = require('detect-audio-autoplay')
var detectMediaSource = require('detect-media-element-source')
var average = require('analyser-frequency-average')
var tapEvent = require('tap-event')

// get our canvas element & 2D context
var canvas = document.querySelector('canvas')
var ctx = canvas.getContext('2d')

// provide some info to the user
var loading = document.querySelector('.loading')
var clickToPlay = document.querySelector('.play')

// full-screen and retina scaled app
var app = createApp(canvas, {
  scale: window.devicePixelRatio
})

// some devices need a "Click to Play"
detectAutoplay(function (autoplay) {
  if (autoplay) {
    canplay()
  } else {
    clickToPlay.style.display = 'block'
    loading.style.display = 'none'

    // On iOS, it has to be a tap event and not a drag + touchend...
    var onTap = tapEvent(function (ev) {
      window.removeEventListener('touchend', onTap)
      ev.preventDefault()
      loading.style.display = 'block'
      clickToPlay.style.display = 'none'
      canplay()
    })
    window.addEventListener('touchend', onTap)
  }
})

function canplay () {
  // Create an iOS-safe AudioContext which fixes
  // potential sampleRate bugs with playback
  // (The hack needs to be called on touchend for iOS!)
  var audioContext = createAudioContext()

  // Detect whether createMediaElementSource() works
  // as expected. You can also use userAgent sniffing here.
  detectMediaSource(function (supportsMediaElement) {
    // No media element support -> we should buffer
    var shouldBuffer = !supportsMediaElement
    start(audioContext, shouldBuffer)
  }, audioContext)
}

function start (audioContext, shouldBuffer) {
  // List of sources, usually good to provide
  // a back up in case MP3 isn't supported.
  var sources = [
    'demo/bluejean_short.mp3',
    'demo/bluejean_short.ogg'
  ]

  // Create a looping audio player with our audio context.
  // On mobile, we use the "buffer" mode to support AudioAnalyser.
  var player = audioPlayer(sources, {
    context: audioContext,
    buffer: true,
    loop: true
  })

  // Set up our AnalyserNode utility
  // Make sure to use the same AudioContext as our player!
  var audioUtil = createAnalyser(player.node, player.context, {
    stereo: false
  })

  // The actual AnalyserNode
  var analyser = audioUtil.analyser

  // This is triggered on mobile, when decodeAudioData begins.
  player.once('decoding', function (amount) {
    loading.innerText = 'Decoding...'
  })

  // Only gets called when loop: false
  player.on('end', function () {
    console.log('Audio ended')
  })

  // If there was an error loading the audio
  player.on('error', function (err) {
    console.error(err.message)
    loading.innerText = 'Error loading audio.'
  })

  // This is called with 'canplay' on desktop, and after
  // decodeAudioData on mobile.
  player.on('load', function () {
    loading.style.display = 'none'

    console.log('Source:', player.element ? 'MediaElement' : 'Buffer')
    console.log('Playing', Math.round(player.duration) + 's of audio...')

    // start audio node
    player.play()

    // start the render loop
    app.on('tick', render)
    app.start()
  })

  // Play/pause on tap
  var click = function () {
    if (player.playing) player.pause()
    else player.play()
    if (player.playing) {
      clickToPlay.style.display = 'none'
    } else {
      clickToPlay.textContent = 'Paused'
      clickToPlay.style.display = 'block'
    }
  }
  window.addEventListener('click', click)

  function render () {
    var width = app.shape[0]
    var height = app.shape[1]

    // retina scaling
    ctx.save()
    ctx.scale(app.scale, app.scale)
    ctx.clearRect(0, 0, width, height)

    // grab our byte frequency data for this frame
    var freqs = audioUtil.frequencies()

    // find an average signal between two Hz ranges
    var minHz = 40
    var maxHz = 100
    var avg = average(analyser, freqs, minHz, maxHz)

    // draw a circle
    ctx.beginPath()
    var radius = Math.min(width, height) / 4 * avg
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
