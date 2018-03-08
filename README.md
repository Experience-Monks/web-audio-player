# web-audio-player

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

[(demo)](http://jam3.github.io/web-audio-player/)

A simplified cross-browser WebAudio wrapper with a narrow API. This repo also attempts to report and solve some ["WebAudio Gotchas"](#webaudio-gotchas) for getting WebAudio working on mobile. It targets new browsers and devices, and does not attempt to provide a non-WebAudio fallback.

See [caniuse.com WebAudio API](http://caniuse.com/#feat=audio-api).

### Motivation

The main use case for this is to support WebAudio features (such as [reverb](https://www.npmjs.com/package/soundbank-reverb) and [frequency analysis](https://www.npmjs.com/package/web-audio-analyser)) across desktop and mobile browsers.

Currently (as of Nov 2015), on recent versions of Safari and Android Chrome, you can only take advantage of these features by buffering and decoding the entire audio file (rather than streaming it).<sup>[[1]](https://code.google.com/p/chromium/issues/detail?id=419446)[[2]](https://bugs.webkit.org/show_bug.cgi?id=125031)</sup>

This module provides a consistent API whether you are using a media element (Chrome/FF) or buffer (other browsers) as the audio source.

### Demo

[http://jam3.github.io/web-audio-player/](http://jam3.github.io/web-audio-player/)

The demo uses [web-audio-analyser](https://github.com/hughsk/web-audio-analyser) and [analyser-frequency-average](https://github.com/Jam3/analyser-frequency-average).

The audio streams and auto-plays on desktop. On mobile, the file is buffered, then decoded, then we wait for user to initiate playback.

### Detection

You can use [detect-media-element-source](https://www.npmjs.com/package/detect-media-element-source) to approximately feature detect whether `createMediaElementSource` will work or not, but you may be better off just using user agent strings or defaulting to a specific behaviour for all mobile browsers.

### Browser Support

Tested with the following browsers/devices.

- Streams Audio
  - Webkit Nightly
  - FireFox 42.0
  - Chrome 46.0
- Buffers Audio
  - Samsung Galaxy S6 (Chrome 46)
  - iOS Safari
    - iOS 9.2, iPhone 5S
    - iOS 8.3 iPad Mini Retina
  - Safari 8.0 (OSX Yosemite)
  - iOS Chrome
    - iOS 8, iPhone 6, Chrome 46
    - iOS 9.2, iPhone 5S, Chrome 45 has a [gotcha](#webaudio-gotchas) (can support streaming)
    - iOS 8.3 iPad Mini Retina (can support streaming)

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
  
  // and connect your node somewhere, such as
  // the AudioContext output so the user can hear it!
  audio.node.connect(audio.context.destination)
})

audio.on('ended', () => {
  console.log('Audio ended...')
})
```

For a complete mobile/desktop demo, see [demo/index.js](demo/index.js). See [Gotchas](#webaudio-gotchas) for more details.

## Usage

[![NPM](https://nodei.co/npm/web-audio-player.png)](https://www.npmjs.com/package/web-audio-player)

#### `player = webAudioPlayer(src, [opt])`

Creates a generic audio player interface from the given `src` file path or array of sources. The `src` elements can be any of the following:

- a string, like `'audio/foo.mp3'`, where the mime-type is guessed from the extension
- an object with `{ src, type }` which allows you to specify an exact mime-type and codec
- a `<source>` DOM element

If `opt.buffer` is true, the audio node is created from a buffer source (not streamed). Otherwise, it is created from a media element source (streamed). The two have different implications.

Full list of options:

- `volume` (Number) volume to play at
- `buffer` (Boolean) whether to use a Buffer source, default false
- `loop` (Boolean) whether to loop the playback, default false
- `loopStart` (Number) point to restart loop in seconds, default 0
- `loopEnd` (Number) point to end loop and restart in seconds, defaults to end of the audio buffer
- `crossOrigin` (String) for media element sources; optional cross origin flag
- `context` (AudioContext) an audio context to use, defaults to a new context. You should re-use contexts, and also consider [ios-safe-audio-context](https://github.com/Jam3/ios-safe-audio-context)
- `element` (Audio|HTMLAudioElement) an optional element to use, defaults to creating a new one. Only applicable when `buffer` is false.
- `autoResume` (Boolean) whether to resume the AudioContext during a call to `play()` if it's state is suspended; default true. This exists to fix a bug with Safari 9+ where the context defaults to being suspended.

When a MediaElement is used as the source, other options will be passed to [simple-media-element](https://github.com/Jam3/simple-media-element).

> :warning: For accurate `loopStart` and `loopEnd` results, you should use a buffer source. MediaElement sources fall back to using a requestAnimationFrame timer, which is less robust, especially when the tab is out of view.

#### `player.play()`

Plays the audio, resuming it from a paused state.

#### `player.pause()`

Pauses the audio.

#### `player.stop()`

Stops the audio, settings its current time back to zero and triggering an `'end'` event.

The next time `play()` is called, the track will start from the beginning.

### properties

#### `player.context` (read-only)

The `AudioContext` being used for this player. You should re-use audio contexts where possible.

#### `player.node` (read-only)

The `AudioNode` for this WebAudio player. 

This will be a `GainNode` that wraps the [MediaElementAudioSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode) or currently playing [AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode).

#### `player.element` (read-only)

If `buffer` is false (the source is a media element), this will be the `HTMLAudioElement` or `Audio` object that is driving the audio. 

If the source is a buffer, this will be undefined.

#### `player.buffer` (read-only)

If we are using a buffer source, this will hold the decoded AudioBuffer instance from the audio file. This will be undefined until the `'loaded'` event is triggered.

If the source is a media element, this will be undefined.

#### `player.duration` (read-only)

The duration of the audio track in seconds. This will most likely only return a meaningful value after the `'load'` event.

#### `player.playing` (read-only)

A read-only boolean to determine whether the audio node is currently playing.

#### `player.volume`

A getter/setter for the `player.node.gain` value, which allows you to adjust the volume during playback. 

### events

#### `player.on('load', fn)`

Called when the player has loaded, and the audio can be played. With a media element, this is after `'canplay'`. With a buffer source, this is after the audio has been decoded.

#### `player.on('end', fn)`

If the audio is not looping, this is called when the audio playback ends. 

This is also triggered when the `stop()` method is called.

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
- Supporting caching or re-using the XHR response

Please open an issue or PR if you wish to discuss a new feature.

## WebAudio Gotchas

There are currently a lot of challenges with cross-platform WebAudio playback. This is likely to change soon as vendors continue fixing bugs.

- Most browsers only support a limited number of AudioContext instances; re-use them where possible.
- When using a `buffer` source that doesn't loop, the audio file will only be playable *once*! You will need to create another buffer source to re-play it. This module handles this for you.
- Browsers/devices which do not support `createMediaElementSource` will need to download and decode the entire audio file before it can be played.
  - There is no means of getting progress callback for the `decodeAudioData` (this is [in discussion](https://github.com/WebAudio/web-audio-api/issues/335))
- In iOS 9.2 Chrome (v45.0.2454.89), there is a bug where opening the app directly to the demo will not play any audio. The user will need to refresh the page in order to hear audio.
- iOS Safari has a bug with `sampleRate` causing playback to be distorted sometimes
  - To solve, use [ios-safe-audio-context](https://github.com/Jam3/ios-safe-audio-context)
  - Also ensure all audio/video across your site uses the same `sampleRate`
- In Chrome Android, using `buffer` and "Add to Home Screen", you can auto-play music without the need for user gesture. This is not the case with iOS "Add to Home Screen."
- In iOS Safari, the `<audio>` tag's `load()` method needs to be called; however, this just causes a second (superfluous) request for the file in most other browsers.
- In Chrome, if `audioElement.load()` is called immediately after `audioElement.play()`, no sound will occur until the next `play()` is called.
- In iOS Safari, audio playback must be triggered on a `'touchend'` *that isn't part of a drag action*. One solution is to attempt audio playback only when the distance and time since `'touchstart'` is less than a certain threshold; see [tap-event](https://github.com/component/tap-event).
- In Safari 9+, AudioContext state might default to "suspended" — to get around this, we resume the context when play() is called
- In recent Chrome, you can't use datauri with `crossOrigin: 'Anonymous'`
- If multiple sources are provided to Safari and the first has an error, the browser will not attempt to load any subsequent sources

## See Also

- [detect-audio-autoplay](https://github.com/Jam3/detect-audio-autoplay) - whether or not user input is necessary for audio playback
- [detect-media-element-source](https://github.com/Jam3/detect-media-element-source) - whether or not `createMediaElementSource()` works as expected
- [ios-safe-audio-context](https://github.com/Jam3/ios-safe-audio-context) - create an audio context that avoids a `sampleRate` distortion bug in iOS6+
- [simple-media-element](https://github.com/Jam3/simple-media-element) - a tiny `<audio>` abstraction

## Changelog

- `1.1.0`
  - `play()` and `pause()` now works the same in both modes
  - `stop()` added to both modes
  - `volume` control added
  - `playing` getter added
  - multiple sources can be passed; will attempt to find a working format
  - emits error when no sources can be played by browser
- `1.0.6`
  - Buffer source can only call play() / pause() once

## License

MIT, see [LICENSE.md](http://github.com/Jam3/web-audio-player/blob/master/LICENSE.md) for details.
