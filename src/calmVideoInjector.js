import { CALM_VIDEO_SRC } from './calmVideo.js'

function applyCalmVideoSource() {
  document.querySelectorAll('video.calm-video').forEach((video) => {
    const source = video.querySelector('source')
    if (!source || source.src === CALM_VIDEO_SRC) return
    source.src = CALM_VIDEO_SRC
    video.load()
    video.play?.().catch(() => {})
  })
}

if (typeof window !== 'undefined') {
  const observer = new MutationObserver(applyCalmVideoSource)
  window.addEventListener('DOMContentLoaded', applyCalmVideoSource)
  window.addEventListener('load', applyCalmVideoSource)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
