require('../')('./demo/bluejean_short.mp3', {
  buffer: false
}).on('error', function (err) {
  console.error('GOT ERROR', err.message)
}).on('load', function () {
  console.log('GOT LOAD')
})