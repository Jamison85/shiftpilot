import { useEffect, useMemo, useRef, useState } from 'react'
import { CALM_VIDEO_SRC } from './calmVideo.js'
import { createCalmSound } from './calmSound.js'
import { ITEM_GUIDES, ITEM_TYPES, STORAGE_KEY, buildPath } from './findtrailData.js'

const SETTINGS_KEY = 'findtrail:settings:v1'
const BREAK_AFTER = 3
const calmLines = ['Only this spot.', 'One small check.', 'No blame.', 'The app is holding the steps.']
const itemSymbols = { money: '$', keys: '⌁', phone: '▯', wallet: '▰', medicine: '+', glasses: '∞', remote: '•', custom: '…' }

const defaultSettings = {
  motion: true,
  reassurance: true,
  bigSteps: true,
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function loadHistory() {
  return readJson(STORAGE_KEY, [])
}

function loadSettings() {
  return { ...defaultSettings, ...readJson(SETTINGS_KEY, defaultSettings) }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 25)))
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function latestFoundForItem(history, itemId) {
  return history.find((entry) => entry.itemId === itemId)?.foundLocation
}

export default function FindTrailAppPro() {
  const [screen, setScreen] = useState('home')
  const [history, setHistory] = useState(loadHistory)
  const [settings, setSettings] = useState(loadSettings)
  const [itemId, setItemId] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [checkedItems, setCheckedItems] = useState({})
  const [foundLocation, setFoundLocation] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => saveHistory(history), [history])
  useEffect(() => saveSettings(settings), [settings])

  const guide = itemId ? ITEM_GUIDES[itemId] : null
  const path = useMemo(() => (itemId ? buildPath(itemId, answers, history) : []), [answers, history, itemId])
  const currentStep = path[stepIndex]
  const question = guide?.questions?.[questionIndex]
  const currentFoundOptions = useMemo(() => {
    const stepOptions = currentStep ? [currentStep.title, ...currentStep.checklist.slice(0, 4)] : []
    return [...new Set([...stepOptions, ...(guide?.foundOptions || [])])].slice(0, 10)
  }, [currentStep, guide])

  function navigate(nextScreen) {
    setCopied(false)
    setScreen(nextScreen)
  }

  function startItem(nextItemId) {
    setItemId(nextItemId)
    setQuestionIndex(0)
    setAnswers({})
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setFoundLocation('')
    setCopied(false)
    setScreen('questions')
  }

  function answerQuestion(value) {
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)
    if (questionIndex + 1 < guide.questions.length) {
      setQuestionIndex(questionIndex + 1)
      return
    }
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setScreen('journey')
  }

  function editClues() {
    setQuestionIndex(0)
    setScreen('questions')
  }

  function checkListItem(label) {
    const key = `${stepIndex}:${label}`
    setCheckedItems((current) => ({ ...current, [key]: !current[key] }))
  }

  function markChecked() {
    setCompletedSteps((current) => [...new Set([...current, stepIndex])])
    if (stepIndex + 1 >= path.length) {
      setScreen('finalSweep')
      return
    }
    const nextStep = stepIndex + 1
    setStepIndex(nextStep)
    if (nextStep > 0 && nextStep % BREAK_AFTER === 0) {
      setScreen('breakOffer')
      return
    }
    setScreen('journey')
  }

  function saveFound() {
    const location = foundLocation || currentStep?.title || 'Found place'
    setFoundLocation(location)
    const entry = {
      id: `${Date.now()}`,
      itemId,
      itemLabel: guide?.title?.replace(' trail', '') || 'Item',
      foundLocation: location,
      foundAt: new Date().toISOString(),
      answers,
    }
    setHistory((current) => [entry, ...current].slice(0, 25))
    setScreen('saved')
  }

  function reset() {
    setItemId(null)
    setQuestionIndex(0)
    setAnswers({})
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setFoundLocation('')
    setCopied(false)
    setScreen('home')
  }

  function restartPath() {
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setCopied(false)
    setScreen('journey')
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  async function copySupportText() {
    const itemLabel = guide?.title?.replace(' trail', '') || 'something important'
    const location = currentStep?.title ? `I am checking: ${currentStep.title}.` : 'I am trying to restart calmly.'
    const message = `I am using FindTrail to look for ${itemLabel}. ${location} Can you help me check one place at a time? Please do not rush me.`

    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className={settings.motion ? 'findtrail-app pro-app' : 'findtrail-app pro-app reduce-magic'}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {screen === 'home' && <HomeScreen history={history} onStart={() => navigate('items')} onBreak={() => navigate('calm')} onNavigate={navigate} />}
      {screen === 'items' && <ItemScreen history={history} onBack={() => navigate('home')} onChoose={startItem} onNavigate={navigate} />}
      {screen === 'questions' && guide && question && (
        <QuestionScreen item={guide} question={question} selectedAnswer={answers[question.id]} questionIndex={questionIndex} questionCount={guide.questions.length} onAnswer={answerQuestion} onBack={() => questionIndex === 0 ? navigate('items') : setQuestionIndex(questionIndex - 1)} />
      )}
      {screen === 'journey' && currentStep && (
        <JourneyScreen settings={settings} item={guide} path={path} stepIndex={stepIndex} completedSteps={completedSteps} checkedItems={checkedItems} onToggle={checkListItem} onFound={() => navigate('found')} onChecked={markChecked} onBreak={() => navigate('calm')} onEditClues={editClues} onRescue={() => navigate('rescue')} />
      )}
      {screen === 'breakOffer' && <BreakOffer onBreak={() => navigate('calm')} onKeepGoing={() => navigate('journey')} onRescue={() => navigate('rescue')} />}
      {screen === 'calm' && <CalmBreak onResume={() => navigate(currentStep ? 'journey' : 'home')} />}
      {screen === 'found' && <FoundScreen options={currentFoundOptions} foundLocation={foundLocation} setFoundLocation={setFoundLocation} onSave={saveFound} onBack={() => navigate('journey')} />}
      {screen === 'saved' && <SavedScreen item={guide} foundLocation={foundLocation} onHome={reset} onAnother={() => navigate('items')} />}
      {screen === 'finalSweep' && <FinalSweep onFound={() => navigate('found')} onBreak={() => navigate('calm')} onRestart={restartPath} onHome={reset} onRescue={() => navigate('rescue')} />}
      {screen === 'history' && <HistoryScreen history={history} onBack={() => navigate('home')} onStart={() => navigate('items')} onNavigate={navigate} />}
      {screen === 'settings' && <SettingsScreen settings={settings} updateSetting={updateSetting} onBack={() => navigate('home')} onNavigate={navigate} />}
      {screen === 'rescue' && <RescueScreen item={guide} currentStep={currentStep} copied={copied} onCopy={copySupportText} onBreak={() => navigate('calm')} onResume={() => navigate(currentStep ? 'journey' : 'home')} onHome={reset} />}
    </main>
  )
}

function HomeScreen({ history, onStart, onBreak, onNavigate }) {
  return (
    <section className="screen home-screen option3-home pro-home">
      <div className="brand-mark" aria-hidden="true"><span /></div>
      <p className="eyebrow">FindTrail</p>
      <h1 className="hero-title">A calm path to finding lost things.</h1>
      <p className="lead">One item. One place. One gentle next step. The app holds the trail when your brain is busy.</p>
      <TrailIllustration className="hero-illustration" />
      <div className="care-rails" aria-label="FindTrail support features">
        <FeatureRail icon="1" title="One thing" text="No piles of instructions." />
        <FeatureRail icon="↺" title="No memory test" text="Change clues anytime." />
        <FeatureRail icon="♡" title="Recover calmly" text="Breaks are built in." />
      </div>
      <div className="action-stack pro-home-actions">
        <button className="primary-btn" onClick={onStart}>Start finding <span aria-hidden="true">→</span></button>
        <button className="secondary-btn calm-btn" onClick={onBreak}><span aria-hidden="true">♡</span> Take a calm minute</button>
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
      {history.length > 0 && <RecentHistory history={history} compact />}
    </section>
  )
}

function FeatureRail({ icon, title, text }) {
  return (
    <div className="feature-rail">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  )
}

function BottomNav({ active, onNavigate }) {
  const items = [
    ['home', '⌂', 'Home'],
    ['history', '◷', 'History'],
    ['calm', '♡', 'Care'],
    ['settings', '⚙', 'Settings'],
  ]

  return (
    <nav className="bottom-nav" aria-label="FindTrail sections">
      {items.map(([id, icon, label]) => (
        <button key={id} className={active === id ? 'bottom-nav-item active' : 'bottom-nav-item'} onClick={() => onNavigate(id)} aria-current={active === id ? 'page' : undefined}>
          <span aria-hidden="true">{icon}</span>{label}
        </button>
      ))}
    </nav>
  )
}

function ItemScreen({ history, onBack, onChoose, onNavigate }) {
  return (
    <section className="screen pro-screen option3-items">
      <TopBar title="What are we finding?" subtitle="Pick one item. The trail adapts from there." onBack={onBack} illustration />
      <div className="pro-notice">
        <strong>Start simple.</strong>
        <span>Choose the lost thing. You do not need to remember everything first.</span>
      </div>
      <div className="item-grid pro-item-grid">
        {ITEM_TYPES.map((item) => {
          const lastFound = latestFoundForItem(history, item.id)
          return (
            <button className="item-card pro-item-card" key={item.id} onClick={() => onChoose(item.id)}>
              <span className={`item-icon ${item.id}`} aria-hidden="true"><span>{itemSymbols[item.id]}</span></span>
              <strong>{item.label}</strong>
              <small>{lastFound ? `Last found: ${lastFound}` : item.hint}</small>
            </button>
          )
        })}
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </section>
  )
}

function QuestionScreen({ item, question, selectedAnswer, questionIndex, questionCount, onAnswer, onBack }) {
  return (
    <section className="screen pro-screen option3-question">
      <TopBar title={question.title} subtitle={question.subtitle} onBack={onBack} illustration />
      <TrailMeter current={questionIndex + 1} total={questionCount} label="Clue" />
      <div className="soft-card item-intro option3-helper-card pro-clue-card">
        <span className="helper-icon" aria-hidden="true">?</span>
        <div>
          <p>Clue {questionIndex + 1} of {questionCount}</p>
          <span>{item.title}. Pick the closest answer, not the perfect answer.</span>
        </div>
      </div>
      <div className="option-stack option3-option-card pro-choice-panel">
        {question.options.map((option) => <button className={selectedAnswer === option ? 'choice-btn selected' : 'choice-btn'} key={option} onClick={() => onAnswer(option)}>{option}</button>)}
      </div>
    </section>
  )
}

function JourneyScreen({ settings, item, path, stepIndex, completedSteps, checkedItems, onToggle, onFound, onChecked, onBreak, onEditClues, onRescue }) {
  const step = path[stepIndex]
  const doneCount = step.checklist.filter((label) => checkedItems[`${stepIndex}:${label}`]).length
  const allChecked = doneCount >= step.checklist.length

  return (
    <section className="screen journey-screen option3-journey pro-journey">
      <TopBar title="Trail Stop" subtitle={calmLines[stepIndex % calmLines.length]} actionLabel="Change clues" onAction={onEditClues} />
      <TrailMeter current={stepIndex + 1} total={path.length} label="Stop" completedSteps={completedSteps} />
      <article className={`step-card tag-${step.tag} pro-step-card`}>
        <div className="editorial-step-head">
          <div>
            <p className="step-kicker">{item.title}</p>
            <h1>{stepIndex + 1}. {step.title}</h1>
            <p>{step.instruction}</p>
          </div>
          <TrailIllustration className="step-illustration" />
        </div>
        <div className="focus-ribbon" role="status">
          <span aria-hidden="true">◎</span>
          <strong>Do only this area right now.</strong>
        </div>
        {settings.reassurance && (
          <div className="option3-helper-card step-helper-card pro-helper-card">
            <span className="helper-icon plum" aria-hidden="true">!</span>
            <div>
              <strong>Try to notice</strong>
              <span>Work down this list slowly. Skip anything that does not apply.</span>
            </div>
          </div>
        )}
        <div className="checklist" role="group" aria-label={`${step.title} checklist`}>
          {step.checklist.map((label) => {
            const checked = checkedItems[`${stepIndex}:${label}`]
            return (
              <button className={checked ? 'check-row checked' : 'check-row'} key={label} onClick={() => onToggle(label)} aria-pressed={checked}>
                <span className="check-dot" aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
        <p className="tiny-note">{doneCount} of {step.checklist.length} checked. {allChecked ? 'Ready for the next step.' : 'No need to hurry.'}</p>
      </article>
      <div className="bottom-actions pro-bottom-actions">
        <button className="found-btn" onClick={onFound}>Found it</button>
        <button className="primary-btn" onClick={onChecked}>{allChecked ? 'Next step' : 'Checked this area'} <span aria-hidden="true">→</span></button>
        <button className="secondary-btn calm-btn" onClick={onBreak}>Calm minute</button>
        <button className="secondary-btn rescue-btn" onClick={onRescue}>I’m overwhelmed</button>
      </div>
    </section>
  )
}

function BreakOffer({ onBreak, onKeepGoing, onRescue }) {
  return (
    <section className="screen center-screen pro-center">
      <div className="pause-symbol" aria-hidden="true" />
      <p className="eyebrow">Pause point</p>
      <h1>Want a calm minute?</h1>
      <p className="lead">You are still on the path. A short reset can keep the search from becoming too much.</p>
      <div className="action-stack">
        <button className="primary-btn" onClick={onBreak}>Take a calm minute</button>
        <button className="secondary-btn" onClick={onKeepGoing}>Keep going</button>
        <button className="ghost-btn" onClick={onRescue}>I’m overwhelmed</button>
      </div>
    </section>
  )
}

function CalmBreak({ onResume }) {
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [soundOn, setSoundOn] = useState(false)
  const calmSoundRef = useRef(null)
  const elapsed = 60 - secondsLeft
  const cycle = elapsed % 12
  const breathState = cycle < 4 ? 'Breathe in' : cycle < 6 ? 'Hold' : 'Breathe out'
  const breathClass = cycle < 4 ? 'inhale' : cycle < 6 ? 'hold' : 'exhale'

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  useEffect(() => {
    calmSoundRef.current?.shapeBreath(breathClass)
  }, [breathClass])

  useEffect(() => () => {
    calmSoundRef.current?.stop()
  }, [])

  async function toggleSound() {
    if (soundOn) {
      calmSoundRef.current?.stop()
      calmSoundRef.current = null
      setSoundOn(false)
      return
    }

    const sound = createCalmSound()
    if (!sound) return
    calmSoundRef.current = sound
    await sound.start()
    sound.shapeBreath(breathClass)
    setSoundOn(true)
  }

  return (
    <section className="calm-screen pro-calm">
      <video className="calm-video" autoPlay muted loop playsInline preload="auto" poster="/calm-poster.svg" aria-hidden="true">
        <source src={CALM_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="calm-overlay" />
      <div className="calm-content pro-calm-content">
        <p className="eyebrow">Calm minute</p>
        <h1>You are still on the path.</h1>
        <p className="breath-helper">Follow the circle.</p>
        <div className={`breath-stage ${breathClass}`} aria-hidden="true">
          <span className="breath-ring ring-one" />
          <span className="breath-ring ring-two" />
          <div className="breath-orb"><span /></div>
        </div>
        <p className="breath-state" aria-live="polite">{breathState}</p>
        <p className="tiny-note calm-timer">{secondsLeft}s left</p>
        <div className="sound-control">
          <button className={soundOn ? 'secondary-btn sound-btn active' : 'secondary-btn sound-btn'} onClick={toggleSound}>
            {soundOn ? 'Breath tone on · tap to mute' : 'Add gentle breath tone'}
          </button>
          <p>Warm tone, no hiss or chimes.</p>
        </div>
        <div className="action-stack">
          <button className="primary-btn" onClick={onResume}>{secondsLeft <= 0 ? 'Resume search' : 'Resume when ready'}</button>
          <button className="secondary-btn" onClick={() => setSecondsLeft(60)}>Restart calm minute</button>
        </div>
      </div>
    </section>
  )
}

function FoundScreen({ options, foundLocation, setFoundLocation, onSave, onBack }) {
  return (
    <section className="screen found-screen pro-screen">
      <div className="success-bloom" aria-hidden="true"><span /></div>
      <p className="eyebrow">Found</p>
      <h1>Found. Good job.</h1>
      <p className="lead">Save where it was so the next search can start smarter.</p>
      <div className="option-chips" role="group" aria-label="Found location options">
        {options.map((option) => <button className={foundLocation === option ? 'chip selected' : 'chip'} key={option} onClick={() => setFoundLocation(option)}>{option}</button>)}
      </div>
      <label className="note-label">
        Custom note
        <input value={foundLocation} onChange={(event) => setFoundLocation(event.target.value)} placeholder="Example: hoodie pocket" />
      </label>
      <div className="bottom-actions">
        <button className="primary-btn" onClick={onSave}>Save found place</button>
        <button className="secondary-btn" onClick={onBack}>Back to search</button>
      </div>
    </section>
  )
}

function SavedScreen({ item, foundLocation, onHome, onAnother }) {
  return (
    <section className="screen center-screen saved-screen pro-center">
      <div className="trail-complete" aria-hidden="true" />
      <p className="eyebrow">Path complete</p>
      <h1>Saved for next time.</h1>
      <p className="lead">{item?.title?.replace(' trail', '') || 'Item'} was found in: <strong>{foundLocation || 'Found place'}</strong>.</p>
      <div className="action-stack">
        <button className="primary-btn" onClick={onAnother}>Find another item</button>
        <button className="secondary-btn" onClick={onHome}>Home</button>
      </div>
    </section>
  )
}

function FinalSweep({ onFound, onBreak, onRestart, onHome, onRescue }) {
  return (
    <section className="screen center-screen pro-center">
      <p className="eyebrow">End of path</p>
      <h1>Pause before searching harder.</h1>
      <p className="lead">The first route is complete. Take a calm minute, repeat the path slowly, or ask another person to help.</p>
      <div className="action-stack">
        <button className="found-btn" onClick={onFound}>I found it</button>
        <button className="primary-btn" onClick={onBreak}>Take a calm minute</button>
        <button className="secondary-btn" onClick={onRestart}>Repeat the path</button>
        <button className="secondary-btn" onClick={onRescue}>Ask for help</button>
        <button className="ghost-btn" onClick={onHome}>Back home</button>
      </div>
    </section>
  )
}

function HistoryScreen({ history, onBack, onStart, onNavigate }) {
  return (
    <section className="screen pro-screen history-screen">
      <TopBar title="Found places" subtitle="Saved only on this device." onBack={onBack} illustration />
      {history.length === 0 ? (
        <div className="empty-state-card">
          <span aria-hidden="true">◷</span>
          <h2>No found places yet.</h2>
          <p>When something is found, FindTrail will remember where it was found so the next trail can start smarter.</p>
          <button className="primary-btn" onClick={onStart}>Start finding</button>
        </div>
      ) : <RecentHistory history={history} />}
      <BottomNav active="history" onNavigate={onNavigate} />
    </section>
  )
}

function SettingsScreen({ settings, updateSetting, onBack, onNavigate }) {
  return (
    <section className="screen pro-screen settings-screen">
      <TopBar title="Settings" subtitle="Make the trail easier on the brain." onBack={onBack} illustration />
      <div className="settings-stack">
        <SettingToggle title="Gentle motion" description="Keeps the soft visual magic. Turn off if motion feels distracting." checked={settings.motion} onChange={(value) => updateSetting('motion', value)} />
        <SettingToggle title="Extra reassurance" description="Shows supportive guidance while searching." checked={settings.reassurance} onChange={(value) => updateSetting('reassurance', value)} />
        <SettingToggle title="Big step labels" description="Keeps actions large and literal." checked={settings.bigSteps} onChange={(value) => updateSetting('bigSteps', value)} />
      </div>
      <div className="pro-notice settings-note">
        <strong>Privacy note</strong>
        <span>Found-place history stays in this browser on this device.</span>
      </div>
      <BottomNav active="settings" onNavigate={onNavigate} />
    </section>
  )
}

function SettingToggle({ title, description, checked, onChange }) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function RescueScreen({ item, currentStep, copied, onCopy, onBreak, onResume, onHome }) {
  return (
    <section className="screen center-screen rescue-screen pro-center">
      <p className="eyebrow">Reset</p>
      <h1>Nothing is wrong. Your brain is overloaded.</h1>
      <p className="lead">Stop the search for one minute. Then choose one safe next action.</p>
      <div className="rescue-card">
        <strong>Current trail</strong>
        <span>{item?.title || 'No item selected'}{currentStep ? ` · ${currentStep.title}` : ''}</span>
      </div>
      <div className="action-stack">
        <button className="primary-btn" onClick={onBreak}>Take a calm minute</button>
        <button className="secondary-btn" onClick={onCopy}>{copied ? 'Help text copied' : 'Copy help text'}</button>
        <button className="secondary-btn" onClick={onResume}>Return to trail</button>
        <button className="ghost-btn" onClick={onHome}>Start over later</button>
      </div>
    </section>
  )
}

function RecentHistory({ history, compact = false }) {
  return (
    <div className={compact ? 'history-card recent-history compact-history' : 'history-card recent-history'}>
      <h2>Recent found places</h2>
      {history.slice(0, compact ? 3 : 12).map((entry) => (
        <div className="history-row" key={entry.id}>
          <span>{entry.itemLabel}</span>
          <strong>{entry.foundLocation}</strong>
          <small>{todayLabel(new Date(entry.foundAt))}</small>
        </div>
      ))}
    </div>
  )
}

function TopBar({ title, subtitle, onBack, actionLabel, onAction, illustration = false }) {
  return (
    <header className={illustration ? 'top-bar top-bar-illustrated' : 'top-bar'}>
      {onBack ? <button className="back-btn" onClick={onBack} aria-label="Go back">‹</button> : <span />}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actionLabel && onAction ? <button className="top-action-btn" onClick={onAction}>{actionLabel}</button> : illustration ? <TrailIllustration className="step-illustration mini" /> : null}
    </header>
  )
}

function TrailMeter({ current, total, label }) {
  return (
    <div className="trail-meter" aria-label={`${label} ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, index) => <span key={index} className={index + 1 < current ? 'done' : index + 1 === current ? 'active' : ''} />)}
    </div>
  )
}

function TrailIllustration({ className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <span className="landscape-sun" />
      <span className="landscape-layer layer-one" />
      <span className="landscape-layer layer-two" />
      <span className="landscape-path" />
      <span className="landscape-tree tree-one" />
      <span className="landscape-tree tree-two" />
    </div>
  )
}
