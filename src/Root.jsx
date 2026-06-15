import { useEffect, useMemo, useState } from 'react'
import App from './App.jsx'
import { estimateTaskInfo } from './taskEstimator.js'
import './priority.css'

const STORAGE_KEY = 'shiftpilot:data:v1'
const ADJUSTMENT_KEY = 'shiftpilot:time-adjustments:v2'
const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', night: 'Night' }
const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', help: 'Moves above everything else' },
  { value: 'high', label: 'High', help: 'Comes right after required routines' },
  { value: 'normal', label: 'Normal', help: 'Standard order' },
]

const priorityRank = { urgent: 0, required: 1, high: 2, normal: 3, low: 4 }
const priorityWeight = { urgent: 1.7, required: 1.45, high: 1.25, normal: 1, low: 0.8 }

function readData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function readTasks() {
  return readData().tasks || []
}

function saveTasks(tasks) {
  try {
    const data = readData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, tasks }))
    return true
  } catch {
    return false
  }
}

function readAdjustments() {
  try {
    return JSON.parse(localStorage.getItem(ADJUSTMENT_KEY)) || { morning: 0, mid: 0, night: 0 }
  } catch {
    return { morning: 0, mid: 0, night: 0 }
  }
}

function taskEstimate(task) {
  const fixedMinutes = Math.max(1, Number(task.minutes) || 15)

  if (task.type !== 'custom') {
    return { minutes: fixedMinutes, category: 'Required routine', confidence: 'high' }
  }

  if (task.estimateSource === 'explicit' || fixedMinutes !== 15) {
    return { minutes: fixedMinutes, category: 'Time you specified', confidence: 'high' }
  }

  return estimateTaskInfo(task.title, fixedMinutes)
}

function allocateTime(tasks, availableMinutes) {
  const total = Math.max(0, Math.round(Number(availableMinutes) || 0))
  const sorted = [...tasks].sort((a, b) => {
    const priority = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3)
    if (priority !== 0) return priority
    return (a.order ?? 99) - (b.order ?? 99)
  })
  const prepared = sorted.map(task => ({ task, estimate: taskEstimate(task) }))

  if (!prepared.length) return { items: [], estimateTotal: 0, allocatedTotal: 0, buffer: total, tight: false }

  const estimateTotal = prepared.reduce((sum, item) => sum + item.estimate.minutes, 0)

  if (total >= estimateTotal) {
    return {
      items: prepared.map(item => ({ ...item, minutes: item.estimate.minutes })),
      estimateTotal,
      allocatedTotal: estimateTotal,
      buffer: total - estimateTotal,
      tight: false,
    }
  }

  const count = prepared.length
  const minimum = total >= count * 5 ? 5 : total >= count ? 1 : 0
  const baseTotal = minimum * count
  const flexible = Math.max(0, total - baseTotal)
  const weighted = prepared.map(item => item.estimate.minutes * (priorityWeight[item.task.priority] || 1))
  const weightTotal = weighted.reduce((sum, weight) => sum + weight, 0) || 1
  const raw = weighted.map(weight => flexible * weight / weightTotal)
  const floors = raw.map(value => Math.floor(value))
  const remainder = flexible - floors.reduce((sum, value) => sum + value, 0)

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction)

  for (let index = 0; index < remainder; index += 1) {
    floors[fractions[index % fractions.length].index] += 1
  }

  return {
    items: prepared.map((item, index) => ({ ...item, minutes: minimum + floors[index] })),
    estimateTotal,
    allocatedTotal: total,
    buffer: 0,
    tight: true,
  }
}

function formatTime(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const remainder = total % 60
  if (!hours) return `${remainder} min`
  if (!remainder) return `${hours} hr`
  return `${hours} hr ${remainder} min`
}

export default function Root() {
  const [panel, setPanel] = useState(null)
  const [tasks, setTasks] = useState([])
  const [appData, setAppData] = useState(readData)
  const [shift, setShift] = useState('morning')
  const [saved, setSaved] = useState(false)
  const [adjustments, setAdjustments] = useState(readAdjustments)

  useEffect(() => {
    if (!panel) return
    const currentData = readData()
    const currentTasks = currentData.tasks || []
    setAppData(currentData)
    setTasks(currentTasks)
    const preferred = currentTasks.find(task => !task.completed && !task.excluded)?.shift
    if (preferred) setShift(preferred)
  }, [panel])

  useEffect(() => {
    localStorage.setItem(ADJUSTMENT_KEY, JSON.stringify(adjustments))
  }, [adjustments])

  const visibleTasks = useMemo(
    () => tasks.filter(task => task.shift === shift && !task.excluded),
    [tasks, shift],
  )

  const remainingTasks = useMemo(
    () => tasks.filter(task => task.shift === shift && !task.completed && !task.excluded),
    [tasks, shift],
  )

  const completedEstimate = useMemo(
    () => tasks
      .filter(task => task.shift === shift && task.completed && !task.excluded)
      .reduce((sum, task) => sum + taskEstimate(task).minutes, 0),
    [tasks, shift],
  )

  const remainingEstimate = useMemo(
    () => remainingTasks.reduce((sum, task) => sum + taskEstimate(task).minutes, 0),
    [remainingTasks],
  )

  const shiftHours = Math.max(0, Number(appData.shiftHours?.[shift]) || 0)
  const automaticBase = shiftHours > 0
    ? Math.max(0, Math.round(shiftHours * 60) - completedEstimate)
    : remainingEstimate
  const availableMinutes = Math.max(0, automaticBase + Number(adjustments[shift] || 0))

  const timePlan = useMemo(
    () => allocateTime(remainingTasks, availableMinutes),
    [remainingTasks, availableMinutes],
  )

  const setPriority = (id, priority) => {
    setTasks(current => current.map(task => task.id === id ? { ...task, priority } : task))
    setSaved(false)
  }

  const handleSave = () => {
    if (!saveTasks(tasks)) return
    setSaved(true)
    window.setTimeout(() => window.location.reload(), 450)
  }

  const adjustTime = amount => {
    setAdjustments(current => ({ ...current, [shift]: Number(current[shift] || 0) + amount }))
  }

  const resetAdjustment = () => {
    setAdjustments(current => ({ ...current, [shift]: 0 }))
  }

  return (
    <>
      <App />

      <div className="planner-launchers">
        <button className="time-launcher" onClick={() => setPanel('budget')} aria-label="Open time budget">
          <span className="time-launcher-icon">◷</span>
          <span>Time Plan</span>
        </button>
        <button className="priority-launcher" onClick={() => setPanel('priority')} aria-label="Prioritize tasks">
          <span className="priority-launcher-icon">!</span>
          <span>Prioritize</span>
        </button>
      </div>

      {panel && (
        <div className="priority-backdrop" onMouseDown={event => event.target === event.currentTarget && setPanel(null)}>
          <section className="priority-panel" aria-modal="true" role="dialog" aria-label={panel === 'budget' ? 'Time budget' : 'Prioritize tasks'}>
            <div className="priority-grabber" />

            {panel === 'priority' && (
              <>
                <header className="priority-header">
                  <div>
                    <span className="priority-eyebrow">TASK PRIORITY</span>
                    <h2>What matters most?</h2>
                    <p>Urgent tasks jump to the top. Required routines stay protected.</p>
                  </div>
                  <button className="priority-close" onClick={() => setPanel(null)} aria-label="Close priority panel">×</button>
                </header>

                <ShiftTabs shift={shift} setShift={setShift} />

                <div className="priority-legend">
                  {PRIORITIES.map(priority => (
                    <div key={priority.value}>
                      <span className={`priority-dot ${priority.value}`} />
                      <span><strong>{priority.label}</strong><small>{priority.help}</small></span>
                    </div>
                  ))}
                </div>

                <div className="priority-task-list">
                  {visibleTasks.length ? visibleTasks.map(task => {
                    const routine = task.priority === 'required'
                    const estimate = taskEstimate(task)
                    return (
                      <article className={`priority-task ${task.completed ? 'completed' : ''}`} key={task.id}>
                        <div className="priority-task-copy">
                          <strong>{task.title}</strong>
                          <span>{task.completed ? 'Completed' : routine ? 'Required routine' : `Smart estimate: ${estimate.minutes} min`}</span>
                        </div>
                        {routine ? (
                          <span className="priority-routine">Routine</span>
                        ) : (
                          <div className="priority-buttons" role="group" aria-label={`Priority for ${task.title}`}>
                            {PRIORITIES.map(priority => (
                              <button
                                key={priority.value}
                                className={`${priority.value} ${task.priority === priority.value ? 'selected' : ''}`}
                                onClick={() => setPriority(task.id, priority.value)}
                                aria-pressed={task.priority === priority.value}
                              >
                                {priority.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    )
                  }) : (
                    <div className="priority-empty">No tasks on this shift yet.</div>
                  )}
                </div>

                <div className="priority-footer">
                  <p>Task times are estimated automatically. You only need to name the work and choose its priority.</p>
                  <button className={saved ? 'saved' : ''} onClick={handleSave}>{saved ? 'Saved' : 'Save priorities'}</button>
                </div>
              </>
            )}

            {panel === 'budget' && (
              <>
                <header className="priority-header time-header">
                  <div>
                    <span className="priority-eyebrow">AUTOMATIC TIME PLAN</span>
                    <h2>ShiftPilot sets the pace</h2>
                    <p>Task times and available minutes are calculated for you from the shift hours already entered.</p>
                  </div>
                  <button className="priority-close" onClick={() => setPanel(null)} aria-label="Close time budget">×</button>
                </header>

                <ShiftTabs shift={shift} setShift={setShift} />

                <section className="budget-input-card auto-budget-card">
                  <span className="auto-budget-label">Automatically available</span>
                  <div className="auto-budget-time">{formatTime(availableMinutes)}</div>
                  <p>
                    {shiftHours > 0
                      ? `Based on ${shiftHours} shift hours minus ${formatTime(completedEstimate)} of completed work.`
                      : 'No shift hours are set, so the plan is using the smart task estimates.'}
                  </p>
                  <div className="budget-adjustments">
                    <button onClick={() => adjustTime(-15)}>−15 min</button>
                    <button className="reset" onClick={resetAdjustment}>Reset</button>
                    <button onClick={() => adjustTime(15)}>+15 min</button>
                  </div>
                  {Number(adjustments[shift] || 0) !== 0 && (
                    <small>Reality adjustment: {adjustments[shift] > 0 ? '+' : ''}{adjustments[shift]} minutes</small>
                  )}
                </section>

                <div className={`budget-summary ${timePlan.tight ? 'tight' : 'comfortable'}`}>
                  <div><span>Time available</span><strong>{formatTime(availableMinutes)}</strong></div>
                  <div><span>Smart estimate</span><strong>{formatTime(timePlan.estimateTotal)}</strong></div>
                  <div><span>{timePlan.tight ? 'Schedule' : 'Buffer'}</span><strong>{timePlan.tight ? 'Compressed' : formatTime(timePlan.buffer)}</strong></div>
                </div>

                {timePlan.tight && remainingTasks.length > 0 && (
                  <p className="budget-warning">There is less time than the smart estimates suggest. Higher-priority work receives more of the available minutes.</p>
                )}

                <div className="budget-task-list">
                  {timePlan.items.length ? timePlan.items.map((item, index) => (
                    <article className={`budget-task ${item.minutes === 0 ? 'defer' : ''}`} key={item.task.id}>
                      <span className="budget-number">{index + 1}</span>
                      <div className="budget-task-copy">
                        <div>
                          <strong>{item.task.title}</strong>
                          <span className={`budget-priority ${item.task.priority}`}>{item.task.priority === 'required' ? 'Routine' : item.task.priority}</span>
                        </div>
                        <small>Smart estimate: {item.estimate.minutes} min · {item.estimate.category}</small>
                      </div>
                      <div className="budget-minutes">
                        <strong>{item.minutes}</strong>
                        <span>{item.minutes === 1 ? 'minute' : 'minutes'}</span>
                      </div>
                    </article>
                  )) : (
                    <div className="priority-empty">Nothing left on this shift. A rare and beautiful event.</div>
                  )}
                </div>

                <div className="budget-total">
                  <span>Total assigned</span>
                  <strong>{formatTime(timePlan.allocatedTotal)}</strong>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function ShiftTabs({ shift, setShift }) {
  return (
    <div className="priority-shift-tabs">
      {Object.entries(SHIFT_LABELS).map(([value, label]) => (
        <button key={value} className={shift === value ? 'active' : ''} onClick={() => setShift(value)}>{label}</button>
      ))}
    </div>
  )
}
