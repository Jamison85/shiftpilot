export function createCalmSound() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  let context
  let master
  let padGain
  let breathGain
  let toneA
  let toneB
  let toneC
  let filter
  let panner
  let stopped = false

  function smoothParam(param, value, timeConstant = 0.8) {
    if (!context || !param) return
    const now = context.currentTime
    param.cancelScheduledValues(now)
    param.setTargetAtTime(value, now, timeConstant)
  }

  function shapeBreath(state) {
    if (!context || !breathGain || !filter || stopped) return
    const gainTargets = { inhale: 0.82, hold: 0.58, exhale: 0.24 }
    const filterTargets = { inhale: 1150, hold: 720, exhale: 360 }
    const detuneTargets = { inhale: 8, hold: 0, exhale: -9 }
    const panTargets = { inhale: -0.08, hold: 0, exhale: 0.08 }

    smoothParam(breathGain.gain, gainTargets[state] || 0.35, 0.95)
    smoothParam(filter.frequency, filterTargets[state] || 520, 1.05)
    smoothParam(toneA.detune, detuneTargets[state] || 0, 1.1)
    smoothParam(toneB.detune, (detuneTargets[state] || 0) * -0.65, 1.1)
    smoothParam(toneC.detune, (detuneTargets[state] || 0) * 0.35, 1.1)
    if (panner?.pan) smoothParam(panner.pan, panTargets[state] || 0, 1.3)
  }

  async function start() {
    context = new AudioContext()
    master = context.createGain()
    padGain = context.createGain()
    breathGain = context.createGain()
    filter = context.createBiquadFilter()
    panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null
    toneA = context.createOscillator()
    toneB = context.createOscillator()
    toneC = context.createOscillator()

    toneA.type = 'sine'
    toneB.type = 'sine'
    toneC.type = 'sine'

    toneA.frequency.setValueAtTime(174.61, context.currentTime)
    toneB.frequency.setValueAtTime(220.0, context.currentTime)
    toneC.frequency.setValueAtTime(87.31, context.currentTime)

    toneA.detune.setValueAtTime(0, context.currentTime)
    toneB.detune.setValueAtTime(0, context.currentTime)
    toneC.detune.setValueAtTime(0, context.currentTime)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(360, context.currentTime)
    filter.Q.setValueAtTime(0.22, context.currentTime)

    padGain.gain.setValueAtTime(0.0001, context.currentTime)
    breathGain.gain.setValueAtTime(0.0001, context.currentTime)
    master.gain.setValueAtTime(0.0001, context.currentTime)

    toneA.connect(padGain)
    toneB.connect(padGain)
    toneC.connect(padGain)
    padGain.connect(breathGain)
    breathGain.connect(filter)

    if (panner) {
      filter.connect(panner)
      panner.connect(master)
      panner.pan.setValueAtTime(0, context.currentTime)
    } else {
      filter.connect(master)
    }

    master.connect(context.destination)

    if (context.state === 'suspended') {
      await context.resume()
    }

    const now = context.currentTime
    toneA.start(now + 0.05)
    toneB.start(now + 0.05)
    toneC.start(now + 0.05)

    padGain.gain.cancelScheduledValues(now)
    breathGain.gain.cancelScheduledValues(now)
    master.gain.cancelScheduledValues(now)
    padGain.gain.setValueAtTime(0.0001, now)
    breathGain.gain.setValueAtTime(0.0001, now)
    master.gain.setValueAtTime(0.0001, now)
    padGain.gain.linearRampToValueAtTime(0.28, now + 1.4)
    breathGain.gain.linearRampToValueAtTime(0.24, now + 1.4)
    master.gain.linearRampToValueAtTime(0.018, now + 2.2)
  }

  function stop() {
    if (!context || stopped) return
    stopped = true
    const now = context.currentTime

    try {
      master?.gain.cancelScheduledValues(now)
      master?.gain.setTargetAtTime(0.0001, now, 0.22)
      window.setTimeout(() => {
        try { toneA?.stop() } catch {}
        try { toneB?.stop() } catch {}
        try { toneC?.stop() } catch {}
        try { context?.close() } catch {}
      }, 650)
    } catch {
      try { context?.close() } catch {}
    }
  }

  return { start, stop, shapeBreath }
}
