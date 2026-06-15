import { useEffect, useMemo, useState } from 'react'
import App from './App.jsx'
import './priority.css'

const STORAGE_KEY = 'shiftpilot:data:v1'
const BUDGET_KEY = 'shiftpilot:time-budget:v1'
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

function readBudgets() {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_KEY)) || { morning: 120, mid: 120, night: 120 }
  } catch {
    return { morning: 120, mid: 120, night: 120 }
  }
}

function allocateTime(tasks, availableMinutes) {
  const total = Math.max(0, Math.round(Number(availableMinutes) || 0))
  const sorted = [...tasks].sort((a, b) => {
    const priority = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3)
    if (priority !== 0) return priority
    return (a.order ?? 99) - (b.order ?? 99)
  })

  if (!sorted.length) return { items: [], estimateTotal: 0, allocatedTotal: 0, buffer: total, tight: false }

  const estimateTotal = sorted.reduce((sum, task) => sum + Math.max(1, Number(task.minutes) || 15), 0)

  if (total >= estimateTotal) {
    return {
      items: sorted.map(task => ({ task, minutes: Math.max(1, Number(task.minutes) || 15) })),
      estimateTotal,
      allocatedTotal: estimateTotal,
      buffer: total - estimateTotal,
      tight: false,
    }
  }

  const count = sorted.length
  const minimum = total >= count * 5 ? 5 : total >= count ? 1 : 0
  const baseTotal = minimum * count
  const flexible = Math.max(0, total - baseTotal)
  const weighted = sorted.map(task => {
    const estimate = Math.max(1, Number(task.minutes) || 15)
    return estimate * (priorityWeight[task.priority] || 1)
  })
  const weightTotal = weighted.reduce((sum, weight) => sum + weight, 0) || 1
  const raw = weighted.map(weight => flexible * weight / weightTotal)
  const floors = raw.map(value => Math.floor(value))
  let remainder = flexible - floors.reduce((sum, value) => sum + value, 0)

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction)

  for (let index = 0; index < remainder; index += 1) {
    floors[fractions[index % fractions.length].index] += 1
  }

  return {
    items: sorted.map((task, index) => ({ task, minutes: minimum + floors[index] })),
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
  const [shift, setShift] = useState('morning')
  const [saved, setSaved] = useState(false)
  const [budgets, setBudgets] = useState(readBudgets)

  useEffect(() => {
    if (!panel) return
    const current = readTasks()
    setTasks(current)
    const preferred = current.find(task => !task.completed && !task.excluded)?.shift
    if (preferred) setShift(preferred)
  }, [panel])

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets))
  }, [budgets])

  const visibleTasks = useMemo(
    () => tasks.filter(task => task.shift === shift && !task.excluded),
    [tasks, shift],
  )

  const remainingTasks = useMemo(
    () => tasks.filter(task => task.shift === shift && !task.completed && !task.excluded),
    [tasks, shift],
  )

  const timePlan = useMemo(
    () => allocateTime(remainingTasks, budgets[shift]),
    [remainingTasks, budgets, shift],
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

  const setBudget = value => {
    const clean = value === '' ? '' : Math.max(0, Math.round(Number(value)))
    setBudgets(current => ({ ...current, [shift]: clean }))
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
                    return (
                      <article className={`priority-task ${task.completed ? 'completed' : ''}`} key={task.id}>
                        <div className="priority-task-copy">
                          <strong>{task.title}</strong>
                          <span>{task.completed ? 'Completed' : routine ? 'Required routine' : `${task.minutes || 15} min`}</span>
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
                  <p>You can also say “urgent fill beer cooler” or “high priority work candy backstock” when using voice add.</p>
                  <button className={saved ? 'saved' : ''} onClick={handleSave}>{saved ? 'Saved' : 'Save priorities'}</button>
                </div>
              </>
            )}

            {panel === 'budget' && (
              <>
                <header className="priority-header time-header">
                  <div>
                    <span className="priority-eyebrow">TIME BUDGET</span>
                    <h2>Make the minutes fit</h2>
                    <p>Enter how much time you have left. ShiftPilot divides it across unfinished tasks.</p>
                  </div>
                  <button className="priority-close" onClick={() => setPanel(null)} aria-label="Close time budget">×</button>
                </header>

                <ShiftTabs shift={shift} setShift={setShift} />

                <section className="budget-input-card">
                  <label htmlFor="minutes-left">Minutes left this shift</label>
                  <div className="budget-input-row">
                    <input
                      id="minutes-left"
                      type="number"
                      min="0"
                      step="5"
                      value={budgets[shift]}
                      onChange={event => setBudget(event.target.value)}
                    />
                    <span>minutes</span>
                  </div>
                  <div className="budget-presets">
                    {[30, 60, 90, 120].map(minutes => (
                      <button key={minutes} className={Number(budgets[shift]) === minutes ? 'active' : ''} onClick={() => setBudget(minutes)}>{minutes}</button>
                    ))}
                    <button onClick={() => setBudget(timePlan.estimateTotal)}>Use estimated</button>
                  </div>
                </section>

                <div className={`budget-summary ${timePlan.tight ? 'tight' : 'comfortable'}`}>
                  <div><span>Time available</span><strong>{formatTime(budgets[shift])}</strong></div>
                  <div><span>Estimated work</span><strong>{formatTime(timePlan.estimateTotal)}</strong></div>
                  <div><span>{timePlan.tight ? 'Schedule' : 'Buffer'}</span><strong>{timePlan.tight ? 'Compressed' : formatTime(timePlan.buffer)}</strong></div>
                </div>

                {timePlan.tight && remainingTasks.length > 0 && (
                  <p className="budget-warning">There is less time than the original estimates. Higher-priority work receives more of the available minutes.</p>
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
                        <small>Original estimate: {item.task.minutes || 15} min</small>
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
