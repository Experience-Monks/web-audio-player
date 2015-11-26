# web-audio-player

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A simplified cross-browser WebAudio wrapper with a narrow API. This repo also attempts to report and solve some ["Gotchas"](#gotchas) for getting WebAudio working on mobile. It targets new browsers and devices, and does not attempt to provide a non-WebAudio fallback.

See [caniuse.com WebAudio API](http://caniuse.com/#feat=audio-api).

### Motivation

The main use case for this is to support WebAudio features (such as [reverb](https://www.npmjs.com/package/soundbank-reverb) and [frequency analysis](https://www.npmjs.com/package/web-audio-analyser)) across desktop and mobile browsers.

Currently (as of Nov 2015), on recent versions of Safari and Android Chrome, you can only take advantage of these features by buffering and decoding the entire audio file (rather than streaming it).<sup>[[1]](https://code.google.com/p/chromium/issues/detail?id=419446)[[2]](https://bugs.webkit.org/show_bug.cgi?id=125031)</sup>

This module provides a consistent API whether you are using a media element (Chrome/FF) or buffer (other browsers) as the audio source.

### Demo

[visualizer demo](http://jam3.github.io/codevember/web-audio-player)

The demo uses [web-audio-analyser](https://github.com/hughsk/web-audio-analyser) and [analyser-frequency-average](https://github.com/Jam3/analyser-frequency-average).

The audio streams and auto-plays on desktop. On mobile, the file is buffered, then decoded, then we wait for user to initiate playback.

### Browser Support

Tested with the following.

- Streams Audio
  - Webkit Nightly
  - FireFox 42.0
  - Chrome 46.0
  - iOS Chrome with a [gotcha](#gotchas) (iOS 9.2, iPhone 5S)
- Buffers Audio
  - Samsung Galaxy S6 (Chrome 46)
  - iOS Safari (iOS 9.2, iPhone 5S)
  - Safari 8.0 (OSX Yosemite)

### Install

Meant to be used with Browserify or Webpack.

```sh
npm install web-audio-player --save
```

### Example

A simple example for Chrome/FF, which does not attempt to solve some of the mobile challenges.

```js
var createPlayer = require('web-audio-player')

var audio = createPlayer('assets/audio.mp3')

audio.on('load', () => {
  console.log('Audio loaded...')
  
  // start playing audio file
  audio.play()
})

audio.on('ended', () => {
  console.log('Audio ended...')
})
```

For a complete mobile/desktop demo, see [demo/index.js](demo/index.js). See [Gotchas](#gotchas) for more details.

## Usage

[![NPM](https://nodei.co/npm/web-audio-player.png)](https://www.npmjs.com/package/web-audio-player)

#### `player = webAudioPlayer(src, [opt])`

Creates a generic audio player interface from the given `src` file path.

If `opt.buffer` is true, the audio node is created from a buffer source (not streamed). Otherwise, it is created from a media element source (streamed). The two have different implications.

Full list of options:

- `buffer` (Boolean) whether to use a Buffer source, default false
- `loop` (Boolean) whether to loop the playback, default false
- `crossOrigin` (String) for media element sources; optional cross origin flag
- `context` (AudioContext) an audio context to use, defaults to a new context. You should re-use contexts, and also consider [ios-safe-audio-context](https://github.com/Jam3/ios-safe-audio-context)
- `element` (Audio|HTMLAudioElement) an optional element to use, defaults to creating a new one. Only applicable when `buffer` is false.

#### `player.play()`

Plays the audio. If you are using a `buffer` source, you can only call this once.

#### `player.pause()`

Stops the audio. If you are using a `buffer` source, you will need to re-load a new player to start playing the audio again.

### properties

#### `player.context`

The `AudioContext` being used for this player. You should re-use audio contexts where possible.

#### `player.node`

The `AudioNode` for this WebAudio player.

#### `player.element`

If `buffer` is false (the source is a media element), this will be the `HTMLAudioElement` or `Audio` object that is driving the audio. 

If the source is a buffer, this will be undefined.

#### `player.duration`

The duration of the audio track in seconds. This will most likely only return a meaningful value after the `'load'` event.

### events

#### `player.on('load', fn)`

Called when the player has loaded, and the audio can be played. With a media element, this is after `'canplay'`. With a buffer source, this is after the audio has been decoded.

#### `player.on('end', fn)`

If the audio is not looping, this is called when the audio playback ends.

#### `player.on('error', fn)`

Called with `(err)` parameters when there was an error loading, buffering or decoding the audio.

#### `player.on('progress', fn)`

If `buffer: true`, this will be called on the progress events of the XMLHttpRequest for the audio file (if the browser supports it). The parameters will be `(percentage, totalBytes)`.

This is not called with a media element source.

#### `player.on('decoding', fn)`

If `buffer: true`, this will be called after the XMLHttpRequest, and before `decodeAudioData` starts. This alows you to provide an update to your user as the audio loads.

This is not called with a media element source.

## Roadmap

Some new features may be added to this module, such as:

- Adding a `currentTime` property
- Adding a seek or `play(N)` feature
- Adding a few more events
- Supporting pause/play with buffered sources if possible

## Gotchas

There are currently a lot of challenges with cross-platform WebAudio playback. This is likely to change soon as vendors continue fixing bugs.

- You only have a limited number of AudioContext instances; re-use them where possible.
- With `buffer: true` and `loop: false`, the audio file will only be playable *once*! You will need to load another file to re-play it.
- Devices/browsers which do not currently support `createMediaElementSource` need to download and decode the entire audio file before it can be played.
  - There is no means of getting progress callback for the `decodeAudioData` (this is [in discussion](https://github.com/WebAudio/web-audio-api/issues/335))
- In iOS 9.2 Chrome (v45.0.2454.89), there is a bug where opening the app directly to the demo will not play any audio. The user will need to refresh the page in order to hear audio.
- iOS Safari has a bug with `sampleRate` causing playback to be distorted sometimes
  - To solve, use [ios-safe-audio-context](https://github.com/Jam3/ios-safe-audio-context)
  - Also ensure all audio/video across your site uses the same `sampleRate`
- In Chrome Android, using `buffer` and "Add to Home Screen", you can auto-play music without the need for user gesture. This is not the case with iOS "Add to Home Screen."
- In iOS Safari, the `<audio>` tag's `load()` method needs to be called; however, this just causes a second (superfluous) request for the file in most other browsers.

## License

MIT, see [LICENSE.md](http://github.com/Jam3/web-audio-player/blob/master/LICENSE.md) for details.
