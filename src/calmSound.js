export function createCalmSound() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  let context
  let source
  let tone
  let master
  let breathGain
  let toneGain
  let filter
  let stopped = false

  function makeSoftNoiseBuffer(ctx) {
    const sampleRate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, sampleRate * 4, sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0

    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.018 * white) / 1.018
      data[index] = last * 3.4
    }

    return buffer
  }

  function shapeBreath(state) {
    if (!context || !breathGain || !filter || stopped) return
    const now = context.currentTime
    const gainTargets = { inhale: 0.9, hold: 0.72, exhale: 0.52 }
    const frequencyTargets = { inhale: 940, hold: 760, exhale: 560 }

    breathGain.gain.cancelScheduledValues(now)
    breathGain.gain.setTargetAtTime(gainTargets[state] || 0.62, now, 0.55)
    filter.frequency.cancelScheduledValues(now)
    filter.frequency.setTargetAtTime(frequencyTargets[state] || 700, now, 0.65)
  }

  async function start() {
    context = new AudioContext()
    master = context.createGain()
    breathGain = context.createGain()
    toneGain = context.createGain()
    filter = context.createBiquadFilter()
    source = context.createBufferSource()
    tone = context.createOscillator()

    source.buffer = makeSoftNoiseBuffer(context)
    source.loop = true

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(720, context.currentTime)
    filter.Q.setValueAtTime(0.5, context.currentTime)

    breathGain.gain.setValueAtTime(0.66, context.currentTime)
    tone.type = 'sine'
    tone.frequency.setValueAtTime(146.83, context.currentTime)
    toneGain.gain.setValueAtTime(0.0045, context.currentTime)

    master.gain.setValueAtTime(0.0001, context.currentTime)

    source.connect(filter)
    filter.connect(breathGain)
    breathGain.connect(master)
    tone.connect(toneGain)
    toneGain.connect(master)
    master.connect(context.destination)

    source.start()
    tone.start()

    if (context.state === 'suspended') {
      await context.resume()
    }

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.exponentialRampToValueAtTime(0.045, now + 1.4)
  }

  function stop() {
    if (!context || stopped) return
    stopped = true
    const now = context.currentTime

    try {
      master?.gain.cancelScheduledValues(now)
      master?.gain.setTargetAtTime(0.0001, now, 0.18)
      window.setTimeout(() => {
        try { source?.stop() } catch {}
        try { tone?.stop() } catch {}
        try { context?.close() } catch {}
      }, 500)
    } catch {
      try { context?.close() } catch {}
    }
  }

  return { start, stop, shapeBreath }
}
