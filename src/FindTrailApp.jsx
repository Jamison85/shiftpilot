import { useEffect, useMemo, useState } from 'react'
import { CALM_VIDEO_SRC } from './calmVideo.js'
import { ITEM_GUIDES, ITEM_TYPES, STORAGE_KEY, buildPath } from './findtrailData.js'

const BREAK_AFTER = 3
const calmLines = ['One step at a time.', 'Only this area right now.', 'No rushing. No blame.', 'The checklist is doing the thinking.']
const itemSymbols = {
  money: '$',
  keys: '⌁',
  phone: '▯',
  wallet: '▰',
  medicine: '+',
  glasses: '∞',
  remote: '•',
  custom: '…',
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 25)))
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function FindTrailApp() {
  const [screen, setScreen] = useState('home')
  const [history, setHistory] = useState(loadHistory)
  const [itemId, setItemId] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [checkedItems, setCheckedItems] = useState({})
  const [foundLocation, setFoundLocation] = useState('')

  useEffect(() => saveHistory(history), [history])

  const guide = itemId ? ITEM_GUIDES[itemId] : null
  const path = useMemo(() => (itemId ? buildPath(itemId, answers, history) : []), [answers, history, itemId])
  const currentStep = path[stepIndex]
  const question = guide?.questions?.[questionIndex]
  const currentFoundOptions = useMemo(() => {
    const stepOptions = currentStep ? [currentStep.title, ...currentStep.checklist.slice(0, 4)] : []
    return [...new Set([...stepOptions, ...(guide?.foundOptions || [])])].slice(0, 10)
  }, [currentStep, guide])

  function startItem(nextItemId) {
    setItemId(nextItemId)
    setQuestionIndex(0)
    setAnswers({})
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setFoundLocation('')
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
    }
  }

  function saveFound() {
    const location = foundLocation || currentStep?.title || 'Found place'
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
    setScreen('home')
  }

  function restartPath() {
    setStepIndex(0)
    setCompletedSteps([])
    setCheckedItems({})
    setScreen('journey')
  }

  return (
    <main className="findtrail-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {screen === 'home' && <HomeScreen history={history} onStart={() => setScreen('items')} onBreak={() => setScreen('calm')} />}
      {screen === 'items' && <ItemScreen onBack={() => setScreen('home')} onChoose={startItem} />}
      {screen === 'questions' && guide && question && (
        <QuestionScreen item={guide} question={question} selectedAnswer={answers[question.id]} questionIndex={questionIndex} questionCount={guide.questions.length} onAnswer={answerQuestion} onBack={() => questionIndex === 0 ? setScreen('items') : setQuestionIndex(questionIndex - 1)} />
      )}
      {screen === 'journey' && currentStep && (
        <JourneyScreen item={guide} path={path} stepIndex={stepIndex} completedSteps={completedSteps} checkedItems={checkedItems} onToggle={checkListItem} onFound={() => setScreen('found')} onChecked={markChecked} onBreak={() => setScreen('calm')} onEditClues={editClues} />
      )}
      {screen === 'breakOffer' && <BreakOffer onBreak={() => setScreen('calm')} onKeepGoing={() => setScreen('journey')} />}
      {screen === 'calm' && <CalmBreak onResume={() => setScreen(currentStep ? 'journey' : 'home')} />}
      {screen === 'found' && (
        <FoundScreen options={currentFoundOptions} foundLocation={foundLocation} setFoundLocation={setFoundLocation} onSave={saveFound} onBack={() => setScreen('journey')} />
      )}
      {screen === 'saved' && <SavedScreen item={guide} foundLocation={foundLocation} onHome={reset} onAnother={() => setScreen('items')} />}
      {screen === 'finalSweep' && <FinalSweep onFound={() => setScreen('found')} onBreak={() => setScreen('calm')} onRestart={restartPath} onHome={reset} />}
    </main>
  )
}

function HomeScreen({ history, onStart, onBreak }) {
  return (
    <section className="screen home-screen">
      <div className="brand-mark" aria-hidden="true"><span /></div>
      <p className="eyebrow">FindTrail</p>
      <h1>A calm path to finding lost things.</h1>
      <p className="lead">Choose the item, follow one simple stop at a time, and let the checklist carry the thinking.</p>
      <p className="slogan-pill">For lost things, not lost minds.</p>
      <div className="action-stack">
        <button className="primary-btn" onClick={onStart}>Start finding</button>
        <button className="secondary-btn" onClick={onBreak}>Take a calm minute</button>
      </div>
      {history.length > 0 && (
        <div className="history-card">
          <h2>Recent found places</h2>
          {history.slice(0, 3).map((entry) => (
            <div className="history-row" key={entry.id}>
              <span>{entry.itemLabel}</span>
              <strong>{entry.foundLocation}</strong>
              <small>{todayLabel(new Date(entry.foundAt))}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ItemScreen({ onBack, onChoose }) {
  return (
    <section className="screen">
      <TopBar title="What are we finding?" subtitle="Pick one. The path adapts from there." onBack={onBack} />
      <div className="item-grid">
        {ITEM_TYPES.map((item) => (
          <button className="item-card" key={item.id} onClick={() => onChoose(item.id)}>
            <span className={`item-icon ${item.id}`} aria-hidden="true"><span>{itemSymbols[item.id]}</span></span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function QuestionScreen({ item, question, selectedAnswer, questionIndex, questionCount, onAnswer, onBack }) {
  return (
    <section className="screen">
      <TopBar title={question.title} subtitle={question.subtitle} onBack={onBack} />
      <TrailMeter current={questionIndex + 1} total={questionCount} label="Clue" />
      <div className="soft-card item-intro">
        <p>{item.title}</p>
        <span>{item.subtitle}</span>
      </div>
      <div className="option-stack">
        {question.options.map((option) => <button className={selectedAnswer === option ? 'choice-btn selected' : 'choice-btn'} key={option} onClick={() => onAnswer(option)}>{option}</button>)}
      </div>
    </section>
  )
}

function JourneyScreen({ item, path, stepIndex, completedSteps, checkedItems, onToggle, onFound, onChecked, onBreak, onEditClues }) {
  const step = path[stepIndex]
  const doneCount = step.checklist.filter((label) => checkedItems[`${stepIndex}:${label}`]).length
  return (
    <section className="screen journey-screen">
      <TopBar title={`Trail Stop ${stepIndex + 1}`} subtitle={calmLines[stepIndex % calmLines.length]} actionLabel="Change clues" onAction={onEditClues} />
      <TrailMeter current={stepIndex + 1} total={path.length} label="Stop" completedSteps={completedSteps} />
      <article className={`step-card tag-${step.tag}`}>
        <p className="step-kicker">{item.title}</p>
        <h1>{step.title}</h1>
        <p>{step.instruction}</p>
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
        <p className="tiny-note">{doneCount} of {step.checklist.length} checked. It is okay if not everything applies.</p>
      </article>
      <div className="bottom-actions">
        <button className="found-btn" onClick={onFound}>Found it</button>
        <button className="primary-btn" onClick={onChecked}>Checked this</button>
        <button className="secondary-btn" onClick={onBreak}>I need a break</button>
      </div>
    </section>
  )
}

function BreakOffer({ onBreak, onKeepGoing }) {
  return (
    <section className="screen center-screen">
      <div className="pause-symbol" aria-hidden="true" />
      <p className="eyebrow">Pause point</p>
      <h1>Want a calm minute?</h1>
      <p className="lead">You are still on the path. A short reset can keep the search from becoming too much.</p>
      <div className="action-stack">
        <button className="primary-btn" onClick={onBreak}>Take a calm minute</button>
        <button className="secondary-btn" onClick={onKeepGoing}>Keep going</button>
      </div>
    </section>
  )
}

function CalmBreak({ onResume }) {
  const [secondsLeft, setSecondsLeft] = useState(60)
  const elapsed = 60 - secondsLeft
  const cycle = elapsed % 12
  const breathState = cycle < 4 ? 'Breathe in' : cycle < 6 ? 'Hold' : 'Breathe out'
  const breathClass = cycle < 4 ? 'inhale' : cycle < 6 ? 'hold' : 'exhale'

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  return (
    <section className="calm-screen">
      <video className="calm-video" autoPlay muted loop playsInline preload="auto" poster="/calm-poster.svg" aria-hidden="true">
        <source src={CALM_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="calm-overlay" />
      <div className="calm-content">
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
    <section className="screen found-screen">
      <div className="success-bloom" aria-hidden="true"><span /></div>
      <p className="eyebrow">Found</p>
      <h1>Found. Good job.</h1>
      <p className="lead">Save where it was so the next search can start smarter.</p>
      <div className="option-chips" role="group" aria-label="Found location options">
        {options.map((option) => (
          <button className={foundLocation === option ? 'chip selected' : 'chip'} key={option} onClick={() => setFoundLocation(option)}>{option}</button>
        ))}
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
    <section className="screen center-screen saved-screen">
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

function FinalSweep({ onFound, onBreak, onRestart, onHome }) {
  return (
    <section className="screen center-screen">
      <p className="eyebrow">End of path</p>
      <h1>Pause before searching harder.</h1>
      <p className="lead">The first route is complete. Take a calm minute, then repeat the path slowly or ask another person to help.</p>
      <div className="action-stack">
        <button className="found-btn" onClick={onFound}>I found it</button>
        <button className="primary-btn" onClick={onBreak}>Take a calm minute</button>
        <button className="secondary-btn" onClick={onRestart}>Repeat the path</button>
        <button className="ghost-btn" onClick={onHome}>Back home</button>
      </div>
    </section>
  )
}

function TopBar({ title, subtitle, onBack, actionLabel, onAction }) {
  return (
    <header className="top-bar">
      {onBack ? <button className="back-btn" onClick={onBack} aria-label="Go back">Back</button> : <span />}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actionLabel && onAction ? <button className="top-action-btn" onClick={onAction}>{actionLabel}</button> : null}
    </header>
  )
}

function TrailMeter({ current, total, label }) {
  return (
    <div className="trail-meter" aria-label={`${label} ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, index) => (
        <span key={index} className={index + 1 < current ? 'done' : index + 1 === current ? 'active' : ''} />
      ))}
    </div>
  )
}
