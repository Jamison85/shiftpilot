export function createCalmSound() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  let context
  let master
  let padGain
  let toneA
  let toneB
  let toneC
  let filter
  let stopped = false

  function smoothParam(param, value, timeConstant = 0.8) {
    if (!context || !param) return
    const now = context.currentTime
    param.cancelScheduledValues(now)
    param.setTargetAtTime(value, now, timeConstant)
  }

  function shapeBreath(state) {
    if (!context || !padGain || !filter || stopped) return
    const gainTargets = { inhale: 0.74, hold: 0.62, exhale: 0.42 }
    const filterTargets = { inhale: 920, hold: 760, exhale: 520 }
    const detuneTargets = { inhale: 4, hold: 0, exhale: -5 }

    smoothParam(padGain.gain, gainTargets[state] || 0.48, 0.75)
    smoothParam(filter.frequency, filterTargets[state] || 640, 0.9)
    smoothParam(toneA.detune, detuneTargets[state] || 0, 0.95)
    smoothParam(toneB.detune, (detuneTargets[state] || 0) * -0.7, 0.95)
  }

  async function start() {
    context = new AudioContext()
    master = context.createGain()
    padGain = context.createGain()
    filter = context.createBiquadFilter()
    toneA = context.createOscillator()
    toneB = context.createOscillator()
    toneC = context.createOscillator()

    toneA.type = 'sine'
    toneB.type = 'sine'
    toneC.type = 'triangle'

    toneA.frequency.setValueAtTime(196.0, context.currentTime)
    toneB.frequency.setValueAtTime(246.94, context.currentTime)
    toneC.frequency.setValueAtTime(98.0, context.currentTime)

    toneA.detune.setValueAtTime(0, context.currentTime)
    toneB.detune.setValueAtTime(0, context.currentTime)
    toneC.detune.setValueAtTime(-3, context.currentTime)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(620, context.currentTime)
    filter.Q.setValueAtTime(0.35, context.currentTime)

    padGain.gain.setValueAtTime(0.44, context.currentTime)
    master.gain.setValueAtTime(0.0001, context.currentTime)

    toneA.connect(padGain)
    toneB.connect(padGain)
    toneC.connect(padGain)
    padGain.connect(filter)
    filter.connect(master)
    master.connect(context.destination)

    toneA.start()
    toneB.start()
    toneC.start()

    if (context.state === 'suspended') {
      await context.resume()
    }

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.exponentialRampToValueAtTime(0.024, now + 1.6)
  }

  function stop() {
    if (!context || stopped) return
    stopped = true
    const now = context.currentTime

    try {
      master?.gain.cancelScheduledValues(now)
      master?.gain.setTargetAtTime(0.0001, now, 0.18)
      window.setTimeout(() => {
        try { toneA?.stop() } catch {}
        try { toneB?.stop() } catch {}
        try { toneC?.stop() } catch {}
        try { context?.close() } catch {}
      }, 500)
    } catch {
      try { context?.close() } catch {}
    }
  }

  return { start, stop, shapeBreath }
}
