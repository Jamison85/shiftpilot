import { useEffect, useMemo, useState } from 'react'
import App from './App.jsx'
import './priority.css'

const STORAGE_KEY = 'shiftpilot:data:v1'
const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', night: 'Night' }
const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', help: 'Moves above everything else' },
  { value: 'high', label: 'High', help: 'Comes right after required routines' },
  { value: 'normal', label: 'Normal', help: 'Standard order' },
]

function readTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return data?.tasks || []
  } catch {
    return []
  }
}

function saveTasks(tasks) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, tasks }))
    return true
  } catch {
    return false
  }
}

export default function Root() {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [shift, setShift] = useState('morning')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    const current = readTasks()
    setTasks(current)
    const preferred = current.find(task => !task.completed && !task.excluded)?.shift
    if (preferred) setShift(preferred)
  }, [open])

  const visibleTasks = useMemo(
    () => tasks.filter(task => task.shift === shift && !task.excluded),
    [tasks, shift],
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

  return (
    <>
      <App />

      <button className="priority-launcher" onClick={() => setOpen(true)} aria-label="Prioritize tasks">
        <span className="priority-launcher-icon">!</span>
        <span>Prioritize</span>
      </button>

      {open && (
        <div className="priority-backdrop" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
          <section className="priority-panel" aria-modal="true" role="dialog" aria-label="Prioritize tasks">
            <div className="priority-grabber" />

            <header className="priority-header">
              <div>
                <span className="priority-eyebrow">TASK PRIORITY</span>
                <h2>What matters most?</h2>
                <p>Urgent tasks jump to the top. Required routines stay protected.</p>
              </div>
              <button className="priority-close" onClick={() => setOpen(false)} aria-label="Close priority panel">×</button>
            </header>

            <div className="priority-shift-tabs">
              {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                <button key={value} className={shift === value ? 'active' : ''} onClick={() => setShift(value)}>{label}</button>
              ))}
            </div>

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
          </section>
        </div>
      )}
    </>
  )
}
