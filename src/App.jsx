import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'shiftpilot:data:v1'
const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', night: 'Night' }
const SHIFT_ORDER = ['morning', 'mid', 'night']

const walkTemplate = () => [
  { id: 'appearance', label: 'Store appearance', checked: false },
  { id: 'restrooms', label: 'Restrooms', checked: false },
  { id: 'cooler', label: 'Cooler & freezer', checked: false },
  { id: 'trash', label: 'Trash', checked: false },
  {
    id: 'coffee-fountain',
    label: 'Coffee & fountain area',
    checked: false,
    children: [
      { id: 'cups', label: 'Cups filled', checked: false },
      { id: 'lids', label: 'Lids filled', checked: false },
      { id: 'straws', label: 'Straws filled', checked: false },
    ],
  },
  {
    id: 'bibs',
    label: 'BIBs',
    checked: false,
    children: [
      { id: 'bibs-check', label: 'Check soda bag-in-box supplies', checked: false },
      { id: 'bibs-replace', label: 'Replace low or empty BIBs', checked: false },
      { id: 'bibs-order', label: 'Flag flavors that need ordering', checked: false },
    ],
  },
  { id: 'warmers', label: 'Food warmers', checked: false },
  { id: 'gaps', label: 'Stock gaps', checked: false },
  { id: 'safety', label: 'Safety issues', checked: false },
  { id: 'handoff', label: 'Handoff items', checked: false },
]

const todayKey = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const initialShift = () => {
  const hour = new Date().getHours()
  if (hour < 11) return 'morning'
  if (hour < 17) return 'mid'
  return 'night'
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const seedTasks = () => [
  {
    id: 'bookwork',
    title: 'Bookwork',
    shift: 'morning',
    minutes: 45,
    priority: 'required',
    completed: false,
    completedAt: null,
    milestone: true,
    excluded: false,
    owner: 'Me',
    type: 'bookwork',
    order: 0,
  },
  {
    id: 'smart-counts',
    title: 'Smart Counts',
    shift: 'morning',
    minutes: 30,
    priority: 'required',
    completed: false,
    completedAt: null,
    milestone: true,
    excluded: false,
    owner: 'Me',
    type: 'smart-counts',
    order: 1,
  },
  ...SHIFT_ORDER.map((shift, index) => ({
    id: `${shift}-walk`,
    title: `${SHIFT_LABELS[shift]} Daily Walk`,
    shift,
    minutes: 20,
    priority: 'required',
    completed: false,
    completedAt: null,
    milestone: false,
    excluded: false,
    owner: 'Me',
    type: 'walk',
    walkItems: walkTemplate(),
    order: index === 0 ? 2 : 0,
  })),
]

const newDay = () => ({
  date: todayKey(),
  truckDay: false,
  activeShift: initialShift(),
  shiftHours: { morning: 8, mid: 8, night: 8 },
  tasks: seedTasks(),
  handoffNotes: { morning: '', mid: '', night: '' },
  extraCompleted: [],
  history: [],
  celebrated: {},
})

const loadData = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved) return newDay()
    if (saved.date !== todayKey()) {
      const snapshot = buildSnapshot(saved)
      return {
        ...newDay(),
        history: [snapshot, ...(saved.history || [])].slice(0, 30),
      }
    }
    return { ...newDay(), ...saved }
  } catch {
    return newDay()
  }
}

const formatDate = date =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

const taskPriorityWeight = task => {
  if (task.priority === 'urgent') return 0
  if (task.priority === 'required') return 1
  if (task.priority === 'high') return 2
  return 3
}

const sortTasks = tasks =>
  [...tasks].sort((a, b) => {
    const priority = taskPriorityWeight(a) - taskPriorityWeight(b)
    if (priority !== 0) return priority
    return (a.order ?? 99) - (b.order ?? 99)
  })

function buildSnapshot(data) {
  return {
    date: data.date,
    completed: data.tasks.filter(t => t.completed && !t.excluded).map(t => t.title),
    extras: data.extraCompleted || [],
    truckDay: data.truckDay,
    savedAt: new Date().toISOString(),
  }
}

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4"/><path d="m8.6 13.5 6.8 4"/></>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    file: <><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    upload: <><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></>,
    spark: <><path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M20 17a7 7 0 0 0-7-7H4"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const [listening, setListening] = useState(false)
  const [confetti, setConfetti] = useState(null)
  const [manualTask, setManualTask] = useState('')
  const [extraText, setExtraText] = useState('')
  const recognitionRef = useRef(null)
  const undoRef = useRef(null)
  const importRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    const timer = toast ? setTimeout(() => setToast(null), 4200) : null
    return () => timer && clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!confetti) return
    const timer = setTimeout(() => setConfetti(null), confetti === 'big' ? 2400 : 1400)
    return () => clearTimeout(timer)
  }, [confetti])

  const activeShift = data.activeShift
  const shiftTasks = useMemo(
    () => sortTasks(data.tasks.filter(task => task.shift === activeShift)),
    [data.tasks, activeShift],
  )

  const actionableShiftTasks = shiftTasks.filter(task => !task.excluded)
  const availableMinutes = Number(data.shiftHours[activeShift] || 0) * 60
  const plannedMinutes = actionableShiftTasks.reduce((sum, task) => sum + Number(task.minutes || 0), 0)
  const completedMinutes = actionableShiftTasks.filter(task => task.completed).reduce((sum, task) => sum + Number(task.minutes || 0), 0)
  const completeCount = actionableShiftTasks.filter(task => task.completed).length
  const capacityPercent = availableMinutes ? Math.min(100, Math.round((plannedMinutes / availableMinutes) * 100)) : 0
  const progressPercent = plannedMinutes ? Math.round((completedMinutes / plannedMinutes) * 100) : 0
  const nextTask = actionableShiftTasks.find(task => !task.completed)

  const updateData = updater => setData(current => typeof updater === 'function' ? updater(current) : updater)

  const showToast = (message, action) => setToast({ message, action })

  const celebrate = type => {
    setConfetti(type)
    if (navigator.vibrate) navigator.vibrate(type === 'big' ? [80, 50, 100] : 50)
  }

  const maybeCompleteShift = nextData => {
    const tasks = nextData.tasks.filter(t => t.shift === nextData.activeShift && !t.excluded)
    const done = tasks.length > 0 && tasks.every(t => t.completed)
    const key = `${nextData.date}:${nextData.activeShift}`
    if (done && !nextData.celebrated[key]) {
      setTimeout(() => celebrate('big'), 180)
      return { ...nextData, celebrated: { ...nextData.celebrated, [key]: true } }
    }
    return nextData
  }

  const completeTask = id => {
    updateData(current => {
      const task = current.tasks.find(item => item.id === id)
      if (!task || task.excluded) return current
      const completing = !task.completed
      let next = {
        ...current,
        tasks: current.tasks.map(item => item.id === id ? {
          ...item,
          completed: completing,
          completedAt: completing ? new Date().toISOString() : null,
        } : item),
      }
      if (completing && task.milestone) setTimeout(() => celebrate('small'), 120)
      return completing ? maybeCompleteShift(next) : next
    })
  }

  const addTask = (title, options = {}) => {
    const clean = title.trim()
    if (!clean) return
    const parsed = parseVoiceTask(clean, options.shift || activeShift)
    const task = {
      id: makeId(),
      title: parsed.title,
      shift: parsed.shift,
      minutes: parsed.minutes,
      priority: parsed.priority,
      completed: Boolean(options.completed),
      completedAt: options.completed ? new Date().toISOString() : null,
      milestone: false,
      excluded: false,
      owner: 'Me',
      type: 'custom',
      order: 99,
    }
    updateData(current => ({ ...current, tasks: [...current.tasks, task] }))
    undoRef.current = task.id
    showToast(`${task.title} added to ${SHIFT_LABELS[task.shift]}`, 'undo')
  }

  const undoLastAdd = () => {
    if (!undoRef.current) return
    updateData(current => ({ ...current, tasks: current.tasks.filter(task => task.id !== undoRef.current) }))
    undoRef.current = null
    setToast(null)
  }

  const startVoice = mode => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSheet(mode === 'extra' ? 'extra' : 'manual')
      showToast('Voice input is unavailable here. Manual entry is open instead.')
      return
    }
    if (recognitionRef.current) recognitionRef.current.abort()
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(mode)
    recognition.onend = () => setListening(false)
    recognition.onerror = event => {
      setListening(false)
      if (event.error !== 'aborted') showToast('I could not catch that. Tap the microphone and try again.')
    }
    recognition.onresult = event => {
      const phrase = event.results[0][0].transcript
      if (mode === 'extra') {
        updateData(current => ({ ...current, extraCompleted: [...(current.extraCompleted || []), phrase] }))
        showToast(`${phrase} added to today’s summary`)
      } else {
        addTask(phrase)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const toggleTruckDay = () => {
    updateData(current => {
      const truckDay = !current.truckDay
      return {
        ...current,
        truckDay,
        tasks: current.tasks.map(task => task.type === 'bookwork' ? {
          ...task,
          owner: truckDay ? 'Loretta' : 'Me',
          minutes: truckDay ? 0 : 45,
          excluded: truckDay,
          completed: truckDay ? false : task.completed,
          completedAt: truckDay ? null : task.completedAt,
        } : task),
      }
    })
  }

  const updateHours = (shift, value) => {
    const clean = value === '' ? '' : Math.max(0, Number(value))
    updateData(current => ({ ...current, shiftHours: { ...current.shiftHours, [shift]: clean } }))
  }

  const deleteTask = id => updateData(current => ({ ...current, tasks: current.tasks.filter(task => task.id !== id) }))

  const openWalk = task => setSheet({ type: 'walk', taskId: task.id })

  const toggleWalkItem = (taskId, itemId, childId) => {
    updateData(current => {
      let shouldCelebrate = false
      const tasks = current.tasks.map(task => {
        if (task.id !== taskId) return task
        const walkItems = task.walkItems.map(item => {
          if (item.id !== itemId) return item
          if (childId) {
            const children = item.children.map(child => child.id === childId ? { ...child, checked: !child.checked } : child)
            return { ...item, children, checked: children.every(child => child.checked) }
          }
          return { ...item, checked: !item.checked }
        })
        const allChecked = walkItems.every(item => item.checked && (!item.children || item.children.every(child => child.checked)))
        shouldCelebrate = allChecked && !task.completed
        return { ...task, walkItems, completed: allChecked, completedAt: allChecked ? new Date().toISOString() : null }
      })
      let next = { ...current, tasks }
      if (shouldCelebrate) next = maybeCompleteShift(next)
      return next
    })
  }

  const buildHandoffText = () => {
    const pending = data.tasks.filter(task => task.shift === activeShift && !task.completed && !task.excluded)
    const completed = data.tasks.filter(task => task.shift === activeShift && task.completed && !task.excluded)
    const note = data.handoffNotes[activeShift]?.trim()
    return [
      `${SHIFT_LABELS[activeShift]} Shift Handoff — ${formatDate(data.date)}`,
      '',
      completed.length ? `Completed:\n${completed.map(task => `✓ ${task.title}`).join('\n')}` : 'Completed: Nothing marked complete yet.',
      '',
      pending.length ? `Still pending:\n${pending.map(task => `• ${task.title}`).join('\n')}` : 'Still pending: Nothing. Shift is complete.',
      note ? `\nNotes:\n${note}` : '',
    ].filter(Boolean).join('\n')
  }

  const completedItems = [
    ...data.tasks.filter(task => task.completed && !task.excluded).map(task => task.title),
    ...(data.extraCompleted || []),
  ]

  const buildSummaryText = () => [
    `Daily Summary — ${formatDate(data.date)}`,
    data.truckDay ? 'Truck Day' : '',
    '',
    completedItems.length ? `Completed today:\n${completedItems.map(item => `✓ ${item}`).join('\n')}` : 'No completed items have been added yet.',
  ].filter(Boolean).join('\n')

  const shareText = async (title, text, saveHistory = false) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
      } else {
        await navigator.clipboard.writeText(text)
        showToast('Copied to your clipboard')
      }
      if (saveHistory) saveTodayToHistory()
    } catch (error) {
      if (error?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text)
          showToast('Copied to your clipboard')
        } catch {
          showToast('Could not open sharing. Your report is still on screen.')
        }
      }
    }
  }

  const saveTodayToHistory = () => {
    updateData(current => {
      const snapshot = buildSnapshot(current)
      const history = [snapshot, ...(current.history || []).filter(item => item.date !== snapshot.date)].slice(0, 30)
      return { ...current, history }
    })
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shiftpilot-backup-${data.date}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Backup downloaded')
  }

  const importBackup = event => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const restored = JSON.parse(reader.result)
        setData({ ...newDay(), ...restored })
        showToast('Backup restored')
        setSheet(null)
      } catch {
        showToast('That backup file could not be read')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const renderTaskCard = (task, index = 0, compact = false) => {
    const isWalk = task.type === 'walk'
    const delegated = task.excluded
    return (
      <article
        key={task.id}
        className={`task-card ${task.completed ? 'is-complete' : ''} ${delegated ? 'is-delegated' : ''}`}
        style={{ '--delay': `${Math.min(index * 45, 250)}ms` }}
      >
        <button
          className="task-check"
          onClick={() => delegated ? null : completeTask(task.id)}
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
          disabled={delegated || isWalk}
        >
          {task.completed && <Icon name="check" size={18} />}
          {delegated && <span className="delegated-dot" />}
        </button>
        <div className="task-main" onClick={() => isWalk ? openWalk(task) : null} role={isWalk ? 'button' : undefined} tabIndex={isWalk ? 0 : undefined}>
          <div className="task-title-row">
            <h3>{task.title}</h3>
            {task.priority === 'urgent' && <span className="pill urgent">Urgent</span>}
            {task.priority === 'required' && <span className="pill required">Routine</span>}
          </div>
          <div className="task-meta">
            {delegated ? <span>Handled by Loretta</span> : <span><Icon name="clock" size={15} /> {task.minutes} min</span>}
            {isWalk && <span>{walkProgress(task)} complete</span>}
          </div>
        </div>
        {isWalk && <button className="icon-button quiet" onClick={() => openWalk(task)} aria-label={`Open ${task.title}`}><Icon name="chevron" /></button>}
        {!compact && task.type === 'custom' && <button className="icon-button quiet danger-hover" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}><Icon name="trash" size={18} /></button>}
      </article>
    )
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand-mark"><Icon name="spark" size={24} /></div>
        <div className="brand-copy">
          <strong>ShiftPilot</strong>
          <span>{formatDate(data.date)}</span>
        </div>
        <button className="icon-button settings-button" onClick={() => setSheet('settings')} aria-label="Open settings"><Icon name="settings" /></button>
      </header>

      <main>
        {tab === 'today' && (
          <section className="page page-enter">
            <div className="hero-card">
              <div>
                <span className="eyebrow">TODAY’S COMMAND CENTER</span>
                <h1>{SHIFT_LABELS[activeShift]} shift</h1>
                <p>{data.truckDay ? 'Truck day is on. Loretta owns bookwork.' : 'Your routine is loaded and ready.'}</p>
              </div>
              <label className="truck-toggle">
                <input type="checkbox" checked={data.truckDay} onChange={toggleTruckDay} />
                <span className="toggle-track"><span /></span>
                <span>Truck Day</span>
              </label>
            </div>

            <div className="shift-tabs" role="tablist" aria-label="Choose shift">
              {SHIFT_ORDER.map(shift => (
                <button
                  key={shift}
                  className={activeShift === shift ? 'active' : ''}
                  onClick={() => updateData(current => ({ ...current, activeShift: shift }))}
                >
                  {SHIFT_LABELS[shift]}
                </button>
              ))}
            </div>

            <button className={`voice-hero ${listening === 'task' ? 'listening' : ''}`} onClick={() => startVoice('task')}>
              <span className="voice-icon"><Icon name="mic" size={30} /></span>
              <span>
                <strong>{listening === 'task' ? 'Listening…' : 'Add a task by voice'}</strong>
                <small>{listening === 'task' ? 'Say the task name now' : 'Tap once. Say it. Done.'}</small>
              </span>
              <span className="voice-wave"><i/><i/><i/></span>
            </button>

            <div className="metrics-grid">
              <div className="metric-card">
                <span>Available</span>
                <strong>{data.shiftHours[activeShift] || 0}<small> hrs</small></strong>
                <button onClick={() => setTab('tasks')}>Edit hours</button>
              </div>
              <div className="metric-card">
                <span>Planned</span>
                <strong>{formatMinutes(plannedMinutes)}</strong>
                <small className={plannedMinutes > availableMinutes ? 'status-over' : 'status-good'}>
                  {availableMinutes === 0 ? 'Set hours' : plannedMinutes > availableMinutes ? 'Over capacity' : `${capacityPercent}% of capacity`}
                </small>
              </div>
              <div className="metric-card progress-metric">
                <span>Completed</span>
                <strong>{completeCount}<small> / {actionableShiftTasks.length}</small></strong>
                <div className="mini-progress"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
            </div>

            <section className="next-card">
              <div className="next-icon"><Icon name="spark" /></div>
              <div>
                <span>DO NEXT</span>
                <h2>{nextTask ? nextTask.title : 'Shift complete'}</h2>
                <p>{nextTask ? `${nextTask.minutes} minutes · ${nextTask.priority === 'required' ? 'routine priority' : `${nextTask.priority} priority`}` : 'You handled everything on this shift.'}</p>
              </div>
              {nextTask && !nextTask.excluded && nextTask.type !== 'walk' && (
                <button className="complete-now" onClick={() => completeTask(nextTask.id)}><Icon name="check" size={18} /> Done</button>
              )}
              {nextTask?.type === 'walk' && <button className="complete-now" onClick={() => openWalk(nextTask)}>Open</button>}
            </section>

            <div className="section-heading">
              <div><span>SHIFT PLAN</span><h2>{SHIFT_LABELS[activeShift]} tasks</h2></div>
              <button className="text-button" onClick={() => setSheet('manual')}><Icon name="plus" size={18} /> Add manually</button>
            </div>

            <div className="task-list">
              {shiftTasks.map((task, index) => renderTaskCard(task, index))}
            </div>

            <button className="finish-shift" disabled={!actionableShiftTasks.length || !actionableShiftTasks.every(t => t.completed)} onClick={() => celebrate('big')}>
              <Icon name="spark" /> Celebrate completed shift
            </button>
          </section>
        )}

        {tab === 'tasks' && (
          <section className="page page-enter">
            <div className="page-title">
              <div><span className="eyebrow">PLAN THE DAY</span><h1>All shifts</h1></div>
              <button className="primary-small" onClick={() => setSheet('manual')}><Icon name="plus" size={18} /> Add task</button>
            </div>
            <div className="planner-stack">
              {SHIFT_ORDER.map(shift => {
                const tasks = sortTasks(data.tasks.filter(task => task.shift === shift))
                const minutes = tasks.filter(t => !t.excluded).reduce((sum, t) => sum + Number(t.minutes || 0), 0)
                const capacity = Number(data.shiftHours[shift] || 0) * 60
                return (
                  <section className="planner-card" key={shift}>
                    <div className="planner-header">
                      <div><span>{SHIFT_LABELS[shift].toUpperCase()}</span><h2>{tasks.filter(t => t.completed && !t.excluded).length} of {tasks.filter(t => !t.excluded).length} done</h2></div>
                      <label className="hours-field">
                        <input type="number" min="0" step="0.25" value={data.shiftHours[shift]} onChange={event => updateHours(shift, event.target.value)} />
                        <span>labor hrs</span>
                      </label>
                    </div>
                    <div className={`capacity-line ${capacity && minutes > capacity ? 'over' : ''}`}><span style={{ width: `${capacity ? Math.min(100, minutes / capacity * 100) : 0}%` }} /></div>
                    <p className="capacity-copy">{formatMinutes(minutes)} planned {capacity ? `of ${formatMinutes(capacity)} available` : '· add available hours'}</p>
                    <div className="task-list compact-list">{tasks.map((task, index) => renderTaskCard(task, index))}</div>
                  </section>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'handoff' && (
          <section className="page page-enter">
            <div className="page-title"><div><span className="eyebrow">WRAP IT UP</span><h1>Handoff & summary</h1></div></div>

            <section className="report-card">
              <div className="report-icon teal"><Icon name="share" /></div>
              <div className="report-heading"><span>SHIFT HANDOFF</span><h2>{SHIFT_LABELS[activeShift]} shift</h2><p>What the next shift needs to know.</p></div>
              <textarea
                value={data.handoffNotes[activeShift] || ''}
                onChange={event => updateData(current => ({ ...current, handoffNotes: { ...current.handoffNotes, [activeShift]: event.target.value } }))}
                placeholder="Add a note, shortage, issue, or anything that needs attention…"
              />
              <div className="report-preview"><pre>{buildHandoffText()}</pre></div>
              <button className="primary-action" onClick={() => shareText(`${SHIFT_LABELS[activeShift]} Shift Handoff`, buildHandoffText())}><Icon name="share" /> Share handoff</button>
            </section>

            <section className="report-card gold-card">
              <div className="report-icon gold"><Icon name="file" /></div>
              <div className="report-heading"><span>DAILY COMPLETION REPORT</span><h2>Send to Loretta</h2><p>Everything you completed today, including extras.</p></div>
              <div className="completed-chips">
                {completedItems.map((item, index) => (
                  <span key={`${item}-${index}`}>{item}{index >= data.tasks.filter(t => t.completed && !t.excluded).length && <button onClick={() => updateData(current => ({ ...current, extraCompleted: current.extraCompleted.filter((_, i) => i !== index - current.tasks.filter(t => t.completed && !t.excluded).length) }))}>×</button>}</span>
                ))}
                {!completedItems.length && <p>Nothing is marked complete yet.</p>}
              </div>
              <div className="extra-row">
                <input value={extraText} onChange={event => setExtraText(event.target.value)} placeholder="Add something else you completed" onKeyDown={event => {
                  if (event.key === 'Enter' && extraText.trim()) {
                    updateData(current => ({ ...current, extraCompleted: [...current.extraCompleted, extraText.trim()] }))
                    setExtraText('')
                  }
                }} />
                <button className={`mic-small ${listening === 'extra' ? 'listening' : ''}`} onClick={() => startVoice('extra')} aria-label="Add completed item by voice"><Icon name="mic" /></button>
                <button className="add-small" onClick={() => {
                  if (!extraText.trim()) return
                  updateData(current => ({ ...current, extraCompleted: [...current.extraCompleted, extraText.trim()] }))
                  setExtraText('')
                }}><Icon name="plus" /></button>
              </div>
              <div className="report-preview"><pre>{buildSummaryText()}</pre></div>
              <button className="primary-action gold-action" onClick={() => shareText('Daily Completion Report', buildSummaryText(), true)}><Icon name="share" /> Share daily summary</button>
            </section>
          </section>
        )}

        {tab === 'history' && (
          <section className="page page-enter">
            <div className="page-title"><div><span className="eyebrow">LAST 30 DAYS</span><h1>History</h1></div><button className="primary-small" onClick={saveTodayToHistory}>Save today</button></div>
            <div className="history-list">
              {(data.history || []).length ? data.history.map((item, index) => (
                <article className="history-card" key={`${item.date}-${index}`}>
                  <div className="history-date"><strong>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T12:00:00`))}</strong><span>{item.truckDay ? 'Truck Day' : 'Regular day'}</span></div>
                  <div><h3>{item.completed.length + (item.extras?.length || 0)} completed</h3><p>{[...item.completed, ...(item.extras || [])].slice(0, 4).join(' · ')}{item.completed.length + (item.extras?.length || 0) > 4 ? '…' : ''}</p></div>
                </article>
              )) : (
                <div className="empty-state"><div><Icon name="history" size={34} /></div><h2>No saved days yet</h2><p>Your daily summaries will appear here after you share or save them.</p></div>
              )}
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}><Icon name="sun" /><span>Today</span></button>
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}><Icon name="list" /><span>Tasks</span></button>
        <button className="nav-mic" onClick={() => startVoice('task')} aria-label="Add task by voice"><span className={listening === 'task' ? 'listening' : ''}><Icon name="mic" size={28} /></span></button>
        <button className={tab === 'handoff' ? 'active' : ''} onClick={() => setTab('handoff')}><Icon name="share" /><span>Handoff</span></button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><Icon name="history" /><span>History</span></button>
      </nav>

      {sheet && (
        <div className="sheet-backdrop" onMouseDown={event => event.target === event.currentTarget && setSheet(null)}>
          <section className="bottom-sheet">
            <div className="sheet-grabber" />
            {sheet === 'manual' && (
              <>
                <div className="sheet-title"><div><span>ADD TASK</span><h2>What needs doing?</h2></div><button className="icon-button" onClick={() => setSheet(null)}>×</button></div>
                <label className="field-label">Task name<input autoFocus value={manualTask} onChange={event => setManualTask(event.target.value)} placeholder="Example: Fill beer cooler" /></label>
                <div className="sheet-actions"><button className="secondary-action" onClick={() => startVoice('task')}><Icon name="mic" /> Use voice</button><button className="primary-action" onClick={() => { addTask(manualTask); setManualTask(''); setSheet(null) }}><Icon name="plus" /> Add to {SHIFT_LABELS[activeShift]}</button></div>
              </>
            )}
            {sheet === 'extra' && (
              <>
                <div className="sheet-title"><div><span>ADD COMPLETED ITEM</span><h2>What else did you finish?</h2></div><button className="icon-button" onClick={() => setSheet(null)}>×</button></div>
                <label className="field-label">Completed item<input autoFocus value={extraText} onChange={event => setExtraText(event.target.value)} placeholder="Example: Fixed missing shelf tags" /></label>
                <button className="primary-action" onClick={() => { if (extraText.trim()) updateData(current => ({ ...current, extraCompleted: [...current.extraCompleted, extraText.trim()] })); setExtraText(''); setSheet(null) }}><Icon name="plus" /> Add to summary</button>
              </>
            )}
            {sheet === 'settings' && (
              <>
                <div className="sheet-title"><div><span>SETTINGS</span><h2>Keep your data safe</h2></div><button className="icon-button" onClick={() => setSheet(null)}>×</button></div>
                <p className="sheet-copy">ShiftPilot stores everything on this phone. Export a backup before clearing browser data or changing phones.</p>
                <button className="settings-row" onClick={exportBackup}><span><Icon name="download" /><span><strong>Download backup</strong><small>Save a copy of tasks and history</small></span></span><Icon name="chevron" /></button>
                <button className="settings-row" onClick={() => importRef.current?.click()}><span><Icon name="upload" /><span><strong>Restore backup</strong><small>Load a ShiftPilot backup file</small></span></span><Icon name="chevron" /></button>
                <input ref={importRef} type="file" accept="application/json" hidden onChange={importBackup} />
              </>
            )}
            {sheet?.type === 'walk' && (() => {
              const task = data.tasks.find(item => item.id === sheet.taskId)
              if (!task) return null
              return (
                <>
                  <div className="sheet-title"><div><span>DAILY WALK</span><h2>{task.title}</h2><p>{walkProgress(task)} complete</p></div><button className="icon-button" onClick={() => setSheet(null)}>×</button></div>
                  <div className="walk-list">
                    {task.walkItems.map(item => (
                      <div className="walk-group" key={item.id}>
                        <button className={`walk-row ${item.checked ? 'checked' : ''}`} onClick={() => toggleWalkItem(task.id, item.id)}>
                          <span className="walk-check">{item.checked && <Icon name="check" size={16} />}</span><strong>{item.label}</strong>
                        </button>
                        {item.children?.map(child => (
                          <button className={`walk-row child ${child.checked ? 'checked' : ''}`} key={child.id} onClick={() => toggleWalkItem(task.id, item.id, child.id)}>
                            <span className="walk-check">{child.checked && <Icon name="check" size={15} />}</span><span>{child.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </section>
        </div>
      )}

      {toast && (
        <div className="toast"><span>{toast.message}</span>{toast.action === 'undo' && <button onClick={undoLastAdd}><Icon name="undo" size={17} /> Undo</button>}</div>
      )}

      {listening && <div className="listening-orb"><span><Icon name="mic" size={34} /></span><strong>Listening…</strong><small>Say the task name</small></div>}

      {confetti && <Confetti size={confetti} />}
    </div>
  )
}

function parseVoiceTask(raw, fallbackShift) {
  let title = raw.trim().replace(/[.?!]+$/, '')
  let shift = fallbackShift
  let minutes = 15
  let priority = 'normal'

  const shiftMatch = title.match(/\b(morning|mid(?:day)?|night|evening)\s*(?:shift)?\b/i)
  if (shiftMatch) {
    const value = shiftMatch[1].toLowerCase()
    shift = value.startsWith('morning') ? 'morning' : value.startsWith('mid') ? 'mid' : 'night'
    title = title.replace(shiftMatch[0], '').replace(/^\s*[,:-]\s*|\s*[,:-]\s*$/g, '').trim()
  }

  const timeMatch = title.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i)
  if (timeMatch) {
    const amount = Number(timeMatch[1])
    minutes = /hour|hr/i.test(timeMatch[2]) ? Math.round(amount * 60) : Math.round(amount)
    title = title.replace(timeMatch[0], '').replace(/^\s*[,:-]\s*|\s*[,:-]\s*$/g, '').trim()
  }

  if (/\burgent\b/i.test(title)) {
    priority = 'urgent'
    title = title.replace(/\burgent\b/i, '').trim()
  } else if (/\bhigh priority\b/i.test(title)) {
    priority = 'high'
    title = title.replace(/\bhigh priority\b/i, '').trim()
  }

  return { title: title || raw, shift, minutes, priority }
}

function walkProgress(task) {
  const flat = task.walkItems.flatMap(item => [item, ...(item.children || [])])
  const checked = flat.filter(item => item.checked).length
  return `${checked}/${flat.length}`
}

function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function Confetti({ size }) {
  const pieces = Array.from({ length: size === 'big' ? 110 : 42 }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: (size === 'big' ? 1.6 : 1) + Math.random() * 0.8,
    rotation: Math.random() * 720,
    scale: 0.7 + Math.random() * 1.2,
    color: ['#0f766e', '#14b8a6', '#f4c95d', '#ef8354', '#4f46e5', '#e11d48'][index % 6],
  }))
  return (
    <div className={`confetti-layer ${size}`} aria-hidden="true">
      {pieces.map(piece => <i key={piece.id} style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}s`, animationDuration: `${piece.duration}s`, '--rotation': `${piece.rotation}deg`, '--scale': piece.scale, background: piece.color }} />)}
      {size === 'big' && <div className="celebration-copy"><Icon name="spark" size={28} /><strong>Shift complete</strong><span>You actually finished the list. Suspiciously impressive.</span></div>}
    </div>
  )
}

export default App
