module.exports = augmentPlayer
function augmentPlayer(player) {
  Object.defineProperties(player, {
    currentTime: {
      enumerable: true, configurable: true,
      get: function () {
        // TODO review for buffer
        if (player.source) {
          return player.source.currentTime
        }
      }
    },
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        if (player.source) {
          return player.source.duration
        }
      }
    }
  })

  return player
}
