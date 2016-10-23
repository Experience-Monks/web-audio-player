module.exports = addOnce
function addOnce (element, event, fn) {
  function tmp (ev) {
    element.removeEventListener(event, tmp, false)
    fn(ev, element)
  }
  element.addEventListener(event, tmp, false)
}