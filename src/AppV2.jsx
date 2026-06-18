import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SHIFT_ORDER, SHIFT_LABELS, PRIORITY_LABELS, loadData, loadPrefs, loadLearning, saveData, savePrefs, saveLearning,
  makeTask, sortTasks, estimateTask, buildPlan, updateLearning, formatDuration, formatTime, parseVoiceCommand, findTask,
  parseSpokenTime, snapshotDay, id, defaultData,
} from './modelV2.js';
import { DayTemplateBanner, HandoffIntelligence, ManagerInsights } from './ManagementPanels.jsx';

const INTERRUPTIONS = [
  ['Register backup', 10, 'register'], ['Customer issue', 10, 'customer'], ['Vendor', 15, 'vendor'],
  ['Employee question', 5, 'employee'], ['Phone call', 5, 'phone'], ['Cleanup', 10, 'cleanup'], ['Other', 10, 'other'],
];

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const path = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>, plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    plan: <><path d="M4 6h16M4 12h10M4 18h7"/><path d="m17 15 3 3-3 3"/></>,
    play: <path d="m8 5 11 7-11 7Z"/>, pause: <><path d="M9 5v14M15 5v14"/></>,
    skip: <><path d="m5 5 10 7L5 19Z"/><path d="M19 5v14"/></>,
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>, close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    upload: <><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></>,
  }[name];
  return <svg {...common}>{path}</svg>;
}

export default function AppV2() {
  const [data, setData] = useState(loadData);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [learning, setLearning] = useState(loadLearning);
  const [tab, setTab] = useState('today');
  const [sheet, setSheet] = useState(null);
  const [planTab, setPlanTab] = useState('live');
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [listening, setListening] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [focus, setFocus] = useState(null);
  const [manualTitle, setManualTitle] = useState('');
  const [extraText, setExtraText] = useState('');
  const [interruptDraft, setInterruptDraft] = useState(null);
  const recognitionRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => saveData(data), [data]);
  useEffect(() => savePrefs(prefs), [prefs]);
  useEffect(() => saveLearning(learning), [learning]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), focus ? 1000 : 30000); return () => clearInterval(timer); }, [focus]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3800); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!confetti) return; const t = setTimeout(() => setConfetti(false), 2400); return () => clearTimeout(t); }, [confetti]);

  const activeShift = data.activeShift || prefs.activeShift || 'morning';
  const plan = useMemo(() => buildPlan(data, prefs, learning, activeShift, now), [data, prefs, learning, activeShift, now]);
  const shiftTasks = useMemo(() => sortTasks(data.tasks.filter(t => t.shift === activeShift && !t.excluded)), [data.tasks, activeShift]);
  const next = plan.items[0];
  const completedCount = shiftTasks.filter(t => t.completed).length;
  const progress = shiftTasks.length ? Math.round(completedCount / shiftTasks.length * 100) : 0;

  const updateData = fn => setData(current => typeof fn === 'function' ? fn(current) : fn);
  const showToast = message => setToast(message);
  const setActiveShift = shift => {
    updateData(current => ({ ...current, activeShift: shift }));
    setPrefs(current => ({ ...current, activeShift: shift }));
  };

  const toggleTruck = () => updateData(current => {
    const truckDay = !current.truckDay;
    return {
      ...current, truckDay,
      tasks: current.tasks.map(task => task.type === 'bookwork' ? { ...task, excluded: truckDay, owner: truckDay ? 'Loretta' : 'Me', completed: truckDay ? false : task.completed } : task),
    };
  });

  const completeTask = (taskId, actualMinutes = null) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    updateData(current => {
      const tasks = current.tasks.map(t => t.id === taskId ? { ...t, completed: true, skipped: false, completedAt: new Date().toISOString(), actualMinutes: actualMinutes || t.actualMinutes } : t);
      return { ...current, tasks };
    });
    if (actualMinutes) setLearning(current => updateLearning(current, task, actualMinutes));
    const remainingAfter = data.tasks.filter(t => t.shift === task.shift && !t.excluded && !t.completed && t.id !== taskId);
    if (!remainingAfter.length) setConfetti(true);
    showToast(`${task.title} complete`);
  };

  const undoComplete = taskId => updateData(current => ({ ...current, tasks: current.tasks.map(t => t.id === taskId ? { ...t, completed: false, completedAt: null } : t) }));

  const addTask = (title, shift = activeShift, priority = 'normal') => {
    const clean = String(title || '').trim();
    if (!clean) return;
    const explicit = /\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i.test(clean);
    const task = makeTask(clean, shift, { priority, estimateSource: explicit ? 'explicit' : 'smart' });
    updateData(current => ({ ...current, tasks: [...current.tasks, task] }));
    showToast(`${clean} added to ${SHIFT_LABELS[shift]}`);
  };

  const handleVoiceResult = phrase => {
    const command = parseVoiceCommand(phrase, activeShift);
    if (command.type === 'add') addTask(command.title, command.shift, command.priority);
    if (command.type === 'complete') {
      const task = findTask(data.tasks.filter(t => !t.completed), command.query, activeShift) || findTask(data.tasks.filter(t => !t.completed), command.query);
      task ? completeTask(task.id) : showToast(`I couldn't find “${command.query}”`);
    }
    if (command.type === 'move') {
      const task = findTask(data.tasks, command.query, activeShift) || findTask(data.tasks, command.query);
      if (!task) return showToast(`I couldn't find “${command.query}”`);
      updateData(current => ({ ...current, tasks: current.tasks.map(t => t.id === task.id ? { ...t, shift: command.shift } : t) }));
      showToast(`${task.title} moved to ${SHIFT_LABELS[command.shift]}`);
    }
    if (command.type === 'handoff') {
      const task = findTask(data.tasks, command.query, activeShift) || findTask(data.tasks, command.query);
      if (!task) return showToast(`I couldn't find “${command.query}”`);
      updateData(current => ({ ...current, tasks: current.tasks.map(t => t.id === task.id ? { ...t, handoff: true } : t) }));
      showToast(`${task.title} added to handoff`);
    }
    if (command.type === 'clockout') {
      const parsed = parseSpokenTime(command.timeText);
      if (!parsed) return showToast('I could not understand that clock-out time');
      setPrefs(current => ({ ...current, clockOut: { ...current.clockOut, [activeShift]: parsed } }));
      showToast(`Clock-out set for ${formatTime(new Date(`${data.date}T${parsed}:00`))}`);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSheet('manual'); return showToast('Voice input is unavailable here. Manual add is open.'); }
    if (recognitionRef.current) recognitionRef.current.abort();
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); showToast('I missed that. Try once more.'); };
    recognition.onresult = event => handleVoiceResult(event.results[0][0].transcript);
    recognitionRef.current = recognition; recognition.start();
  };

  const startFocus = item => {
    if (!item) return;
    setFocus({ taskId: item.task.id, durationSec: Math.max(60, item.allotted * 60), startedAt: Date.now(), pausedAt: null, pausedMs: 0, running: true });
  };
  const focusTask = focus ? data.tasks.find(t => t.id === focus.taskId) : null;
  const focusElapsedSec = focus ? Math.max(0, Math.floor(((focus.pausedAt || Date.now()) - focus.startedAt - focus.pausedMs) / 1000)) : 0;
  const focusRemainingSec = focus ? Math.max(0, focus.durationSec - focusElapsedSec) : 0;
  const togglePause = () => setFocus(current => {
    if (!current) return current;
    if (current.running) return { ...current, running: false, pausedAt: Date.now() };
    return { ...current, running: true, pausedMs: current.pausedMs + (Date.now() - current.pausedAt), pausedAt: null };
  });
  const finishFocus = () => {
    if (!focusTask) return;
    const actual = Math.max(1, Math.ceil(focusElapsedSec / 60));
    completeTask(focusTask.id, actual);
    setFocus(null);
  };
  const skipFocus = () => {
    if (!focusTask) return;
    updateData(current => ({ ...current, tasks: current.tasks.map(t => t.id === focusTask.id ? { ...t, skipped: true } : t) }));
    setFocus(null); showToast(`${focusTask.title} skipped for now`);
  };
  const openInterruption = () => {
    if (focus?.running) togglePause();
    setInterruptDraft({ label: 'Register backup', minutes: 10, type: 'register', fromFocus: true });
  };
  const logInterruption = draft => {
    if (!draft) return;
    updateData(current => ({ ...current, interruptions: [...(current.interruptions || []), { id: id(), date: current.date, shift: activeShift, label: draft.label, minutes: Number(draft.minutes) || 5, createdAt: new Date().toISOString() }] }));
    setInterruptDraft(null);
    if (draft.fromFocus && focus && !focus.running) togglePause();
    showToast(`${draft.label}: ${draft.minutes} minutes logged`);
  };

  const toggleWalkItem = (taskId, itemId) => updateData(current => {
    const tasks = current.tasks.map(task => {
      if (task.id !== taskId) return task;
      const items = task.walkItems.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
      const parent = items.find(item => item.id === itemId)?.parent;
      if (parent) {
        const childItems = items.filter(item => item.parent === parent);
        const parentIndex = items.findIndex(item => item.id === parent);
        items[parentIndex] = { ...items[parentIndex], checked: childItems.every(child => child.checked) };
      } else {
        const children = items.filter(item => item.parent === itemId);
        if (children.length) for (const child of children) child.checked = items.find(item => item.id === itemId).checked;
      }
      const required = items.filter(item => !item.parent);
      const done = required.every(item => item.checked);
      return { ...task, walkItems: items, completed: done, completedAt: done ? new Date().toISOString() : null };
    });
    return { ...current, tasks };
  });

  const handoffText = () => {
    const pending = data.tasks.filter(t => t.shift === activeShift && !t.completed && !t.excluded);
    const marked = pending.filter(t => t.handoff);
    const completed = data.tasks.filter(t => t.shift === activeShift && t.completed && !t.excluded);
    const notes = data.handoffNotes?.[activeShift]?.trim();
    return [
      `${SHIFT_LABELS[activeShift]} Shift Handoff`, '',
      completed.length ? `Completed:\n${completed.map(t => `✓ ${t.title}`).join('\n')}` : 'Completed: Nothing marked yet.', '',
      (marked.length ? marked : pending).length ? `Needs attention:\n${(marked.length ? marked : pending).map(t => `• ${t.title}`).join('\n')}` : 'Needs attention: Nothing.',
      notes ? `\nNotes:\n${notes}` : '',
    ].filter(Boolean).join('\n');
  };
  const dailySummaryText = () => {
    const completed = data.tasks.filter(t => t.completed && !t.excluded).map(t => t.title);
    return ['Daily Summary', data.truckDay ? 'Truck Day' : '', '', ...[...completed, ...(data.extraCompleted || [])].map(x => `✓ ${x}`)].filter(Boolean).join('\n');
  };
  const share = async (title, text, saveHistory = false) => {
    try { if (navigator.share) await navigator.share({ title, text }); else { await navigator.clipboard.writeText(text); showToast('Copied to clipboard'); } }
    catch (error) { if (error?.name !== 'AbortError') showToast('Sharing did not open. The report is still here.'); }
    if (saveHistory) updateData(current => ({ ...current, history: [snapshotDay(current), ...(current.history || []).filter(h => h.date !== current.date)].slice(0, 30) }));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ data, prefs, learning }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `shiftpilot-${data.date}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importBackup = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const restored = JSON.parse(reader.result); if (restored.data) setData(restored.data); if (restored.prefs) setPrefs(restored.prefs); if (restored.learning) setLearning(restored.learning); setSheet(null); showToast('Backup restored'); } catch { showToast('That backup could not be read'); } };
    reader.readAsText(file); event.target.value = '';
  };

  const resetToday = () => {
    const ok = window.confirm('Reset today\'s workspace? This clears today\'s checkmarks, notes, interruptions, and custom tasks, but keeps History, learned times, and settings.');
    if (!ok) return;
    setFocus(null);
    setInterruptDraft(null);
    updateData(current => ({
      ...defaultData(current.date),
      history: current.history || [],
      activeShift: current.activeShift || activeShift,
    }));
    setSheet(null);
    setTab('today');
    showToast('Today reset. History and learned times were kept.');
  };

  return <div className="sp-app">
    <header className="sp-topbar">
      <div className="sp-logo">SP</div><div className="sp-brand"><strong>ShiftPilot</strong><span>{new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric'}).format(now)}</span></div>
      <button className="sp-icon-btn" onClick={() => setSheet('settings')}><Icon name="gear" /></button>
    </header>

    <main className="sp-main">
      {tab === 'today' && <section className="sp-page sp-page-enter">
        <div className="sp-hero">
          <div className="sp-hero-row"><div><span className="sp-kicker">GUIDED COMMAND CENTER</span><h1>{SHIFT_LABELS[activeShift]} shift</h1></div>
            <label className="sp-truck"><input type="checkbox" checked={data.truckDay} onChange={toggleTruck}/><span/><b>Truck Day</b></label></div>
          <div className="sp-shift-tabs">{SHIFT_ORDER.map(shift => <button className={shift===activeShift?'active':''} key={shift} onClick={()=>setActiveShift(shift)}>{SHIFT_LABELS[shift]}</button>)}</div>
          <div className="sp-hero-status">
            <div><span>Clock out</span><strong>{plan.clockOut ? formatTime(plan.clockOut) : 'Not set'}</strong></div>
            <div><span>Time left</span><strong>{formatDuration(plan.available)}</strong></div>
            <div className={plan.behindBy ? 'behind' : 'ahead'}><span>{plan.behindBy ? 'Behind' : 'Ahead'}</span><strong>{formatDuration(plan.behindBy || plan.aheadBy)}</strong></div>
          </div>
        </div>

        <button className={`sp-voice ${listening?'listening':''}`} onClick={startVoice}><span><Icon name="mic" size={28}/></span><div><strong>{listening?'Listening…':'Tell ShiftPilot'}</strong><small>Add, complete, move, hand off, or set clock-out</small></div></button>

        <section className="sp-now-card">
          <div className="sp-now-head"><span>DO THIS NOW</span><b>{progress}% shift complete</b></div>
          {next ? <>
            <h2>{next.task.title}</h2>
            <div className="sp-now-details"><span><Icon name="clock" size={16}/>{next.allotted} minutes</span><span>Finish by {formatTime(next.finish)}</span><span className={`sp-priority ${next.task.priority}`}>{PRIORITY_LABELS[next.task.priority]}</span></div>
            {next.estimate.source === 'learned' && <p className="sp-learned">Personalized from your actual completion history.</p>}
            <button className="sp-focus-start" onClick={()=>startFocus(next)}><Icon name="play"/> Start Focus Mode</button>
          </> : <div className="sp-empty-now"><Icon name="check" size={36}/><h2>Shift complete</h2><p>Everything planned for this shift is done.</p></div>}
        </section>

        <div className="sp-status-grid">
          <article><span>WORK LEFT</span><strong>{formatDuration(plan.estimateTotal)}</strong><small>{plan.items.length} task{plan.items.length===1?'':'s'}</small></article>
          <article><span>INTERRUPTIONS</span><strong>{formatDuration(plan.interruptionMinutes)}</strong><small>logged today</small></article>
          <article><span>COMPLETED</span><strong>{completedCount}/{shiftTasks.length}</strong><div className="sp-progress"><i style={{width:`${progress}%`}}/></div></article>
        </div>

        <button className="sp-plan-button" onClick={()=>{setPlanTab('live');setSheet('plan')}}><Icon name="plan"/><div><strong>Plan My Shift</strong><small>Live plan, priorities, clock-out, interruptions</small></div><Icon name="chevron"/></button>

        <div className="sp-section-title"><div><span>COMING UP</span><h2>Next tasks</h2></div><button onClick={()=>setTab('tasks')}>See all</button></div>
        <div className="sp-upcoming">
          {plan.items.slice(1,5).map((item,index)=><CompactTask key={item.task.id} item={item} index={index+2} onFocus={()=>startFocus(item)} onComplete={()=>completeTask(item.task.id)} onWalk={()=>setSheet({type:'walk',taskId:item.task.id})}/>) }
          {!plan.items.slice(1,5).length && <div className="sp-empty-list">No later tasks waiting.</div>}
        </div>
      </section>}

      {tab === 'tasks' && <TasksPage data={data} learning={learning} activeShift={activeShift} setActiveShift={setActiveShift} setData={setData} addTask={()=>setSheet('manual')} openWalk={taskId=>setSheet({type:'walk',taskId})} completeTask={completeTask} undoComplete={undoComplete}/>} 
      {tab === 'handoff' && <HandoffPage data={data} activeShift={activeShift} setData={setData} handoffText={handoffText()} summaryText={dailySummaryText()} share={share} extraText={extraText} setExtraText={setExtraText}/>} 
      {tab === 'history' && <HistoryPage data={data} learning={learning} share={share}/>} 
    </main>

    <nav className="sp-nav">
      <button className={tab==='today'?'active':''} onClick={()=>setTab('today')}><Icon name="home"/><span>Today</span></button>
      <button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}><Icon name="list"/><span>Tasks</span></button>
      <button className="sp-nav-mic" onClick={startVoice}><span className={listening?'listening':''}><Icon name="mic" size={28}/></span></button>
      <button className={tab==='handoff'?'active':''} onClick={()=>setTab('handoff')}><Icon name="share"/><span>Handoff</span></button>
      <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><Icon name="history"/><span>History</span></button>
    </nav>

    {sheet && <Sheet onClose={()=>setSheet(null)}>
      {sheet==='plan' && <PlanSheet planTab={planTab} setPlanTab={setPlanTab} data={data} setData={setData} prefs={prefs} setPrefs={setPrefs} learning={learning} activeShift={activeShift} setActiveShift={setActiveShift} plan={plan} startFocus={startFocus} setInterruptDraft={setInterruptDraft}/>} 
      {sheet==='manual' && <ManualSheet title={manualTitle} setTitle={setManualTitle} shift={activeShift} onAdd={()=>{addTask(manualTitle);setManualTitle('');setSheet(null)}} startVoice={startVoice}/>} 
      {sheet==='settings' && <SettingsSheet exportBackup={exportBackup} importRef={importRef} resetToday={resetToday}/>} 
      {sheet?.type==='walk' && <WalkSheet task={data.tasks.find(t=>t.id===sheet.taskId)} toggle={itemId=>toggleWalkItem(sheet.taskId,itemId)} complete={()=>{completeTask(sheet.taskId);setSheet(null)}}/>}
    </Sheet>}

    {focus && focusTask && <FocusMode task={focusTask} remainingSec={focusRemainingSec} elapsedSec={focusElapsedSec} running={focus.running} togglePause={togglePause} complete={finishFocus} skip={skipFocus} interruption={openInterruption} estimate={estimateTask(focusTask,learning)}/>} 
    {interruptDraft && <InterruptionModal draft={interruptDraft} setDraft={setInterruptDraft} log={logInterruption} close={()=>{setInterruptDraft(null);if(focus&&!focus.running)togglePause()}}/>}
    {listening && <div className="sp-listening"><span><Icon name="mic" size={34}/></span><strong>Listening…</strong><small>Try “mark Smart Counts complete”</small></div>}
    {toast && <div className="sp-toast">{toast}</div>}
    {confetti && <Confetti/>}
    <input ref={importRef} type="file" accept="application/json" hidden onChange={importBackup}/>
  </div>;
}

function CompactTask({ item, index, onFocus, onComplete, onWalk }) {
  return <article className="sp-compact-task"><span className="sp-seq">{index}</span><div><strong>{item.task.title}</strong><small>{item.allotted} min · finish {formatTime(item.finish)}</small></div><span className={`sp-dot ${item.task.priority}`}/>{item.task.type==='walk'?<button onClick={onWalk}>Open</button>:<button onClick={onFocus}><Icon name="play" size={16}/></button>}<button onClick={onComplete}><Icon name="check" size={16}/></button></article>;
}

function TasksPage({ data, learning, activeShift, setActiveShift, setData, addTask, openWalk, completeTask, undoComplete }) {
  return <section className="sp-page sp-page-enter"><div className="sp-page-head"><div><span className="sp-kicker dark">PLAN THE WORK</span><h1>Tasks</h1></div><button className="sp-small-primary" onClick={addTask}><Icon name="plus" size={18}/> Add</button></div>
    <div className="sp-shift-tabs light">{SHIFT_ORDER.map(shift=><button key={shift} className={shift===activeShift?'active':''} onClick={()=>setActiveShift(shift)}>{SHIFT_LABELS[shift]}</button>)}</div>
    <DayTemplateBanner data={data}/>
    <div className="sp-hours-card"><div><span>AVAILABLE LABOR HOURS</span><strong>{data.shiftHours?.[activeShift] || 0}</strong></div><input type="number" min="0" step=".25" value={data.shiftHours?.[activeShift]??''} onChange={e=>setData(current=>({...current,shiftHours:{...current.shiftHours,[activeShift]:e.target.value===''?'':Math.max(0,Number(e.target.value))}}))}/></div>
    <div className="sp-task-stack">{sortTasks(data.tasks.filter(t=>t.shift===activeShift&&!t.excluded)).map(task=>{
      const estimate=estimateTask(task,learning); return <article className={`sp-task-row ${task.completed?'done':''} ${task.skipped?'skipped':''}`} key={task.id}>
        <button className="sp-check" onClick={()=>task.completed?undoComplete(task.id):completeTask(task.id)}>{task.completed&&<Icon name="check" size={17}/>}</button>
        <div onClick={()=>task.type==='walk'&&openWalk(task.id)}><strong>{task.title}</strong><small>{estimate.minutes} min · {estimate.category}{task.skipped?' · skipped':''}</small></div>
        <span className={`sp-priority ${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        {task.type==='walk'&&<button className="sp-row-action" onClick={()=>openWalk(task.id)}>Open</button>}
      </article>})}</div>
  </section>;
}

function HandoffPage({ data, activeShift, setData, handoffText, summaryText, share, extraText, setExtraText }) {
  const completed=data.tasks.filter(t=>t.completed&&!t.excluded).map(t=>t.title);
  return <section className="sp-page sp-page-enter"><div className="sp-page-head"><div><span className="sp-kicker dark">WRAP IT UP</span><h1>Handoff</h1></div></div>
    <HandoffIntelligence data={data} activeShift={activeShift} setData={setData}/>
    <article className="sp-report"><span className="sp-report-label">SHIFT HANDOFF</span><h2>{SHIFT_LABELS[activeShift]} shift</h2><p>Unfinished or marked items are included automatically.</p>
      <textarea value={data.handoffNotes?.[activeShift]||''} onChange={e=>setData(current=>({...current,handoffNotes:{...current.handoffNotes,[activeShift]:e.target.value}}))} placeholder="Shortages, issues, or notes…"/>
      <pre>{handoffText}</pre><button onClick={()=>share('Shift Handoff',handoffText)}><Icon name="share"/> Share handoff</button></article>
    <article className="sp-report gold"><span className="sp-report-label">DAILY COMPLETION REPORT</span><h2>Send to Loretta</h2><div className="sp-chips">{[...completed,...(data.extraCompleted||[])].map((x,i)=><span key={`${x}-${i}`}>{x}</span>)}</div>
      <div className="sp-extra"><input value={extraText} onChange={e=>setExtraText(e.target.value)} placeholder="Add something else you completed"/><button onClick={()=>{if(!extraText.trim())return;setData(current=>({...current,extraCompleted:[...(current.extraCompleted||[]),extraText.trim()]}));setExtraText('')}}><Icon name="plus"/></button></div>
      <pre>{summaryText}</pre><button className="gold-btn" onClick={()=>share('Daily Completion Report',summaryText,true)}><Icon name="share"/> Share daily summary</button></article>
  </section>;
}

function HistoryPage({ data, learning, share }) {
  const history=data.history||[];
  const learned=Object.values(learning).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0,4);
  return <section className="sp-page sp-page-enter"><div className="sp-page-head"><div><span className="sp-kicker dark">MANAGER RECORDS</span><h1>History</h1></div></div>
    <ManagerInsights data={data} learning={learning} share={share}/>
    {learned.length>0&&<div className="sp-learning-card"><h2>Your real pace</h2>{learned.map(item=><div key={item.title}><strong>{item.title}</strong><span>{item.average} min average · {item.count} finishes</span></div>)}</div>}
    <div className="sp-history-list">{history.length?history.map((day,i)=><article key={`${day.date}-${i}`}><time>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(`${day.date}T12:00:00`))}</time><div><strong>{day.completed.length+(day.extras?.length||0)} completed</strong><span>{[...day.completed,...(day.extras||[])].slice(0,4).join(' · ')}</span><div className="mg-history-meta">{day.unfinished?.length||0} unfinished · {(day.interruptions||[]).reduce((sum,item)=>sum+(Number(item.minutes)||0),0)} interruption minutes{day.templateName?` · ${day.templateName}`:''}</div></div></article>):<div className="sp-empty-list large">No saved days yet.</div>}</div>
  </section>;
}

function Sheet({ children, onClose }) { return <div className="sp-sheet-bg" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="sp-sheet"><div className="sp-grabber"/><button className="sp-sheet-close" onClick={onClose}><Icon name="close"/></button>{children}</section></div>; }

function PlanSheet({ planTab,setPlanTab,data,setData,prefs,setPrefs,learning,activeShift,setActiveShift,plan,startFocus,setInterruptDraft }) {
  const tasks=sortTasks(data.tasks.filter(t=>t.shift===activeShift&&!t.excluded));
  return <><header className="sp-sheet-head"><span>PLAN MY SHIFT</span><h2>Guided control center</h2><p>Everything important, without six floating buttons staging a coup.</p></header>
    <div className="sp-plan-tabs">{[['live','Live Plan'],['priority','Priorities'],['clock','Clock-out'],['interrupt','Interruptions']].map(([v,l])=><button className={planTab===v?'active':''} key={v} onClick={()=>setPlanTab(v)}>{l}</button>)}</div>
    <div className="sp-shift-tabs light">{SHIFT_ORDER.map(s=><button key={s} className={s===activeShift?'active':''} onClick={()=>setActiveShift(s)}>{SHIFT_LABELS[s]}</button>)}</div>
    {planTab==='live'&&<div className="sp-plan-list"><div className={`sp-plan-banner ${plan.behindBy?'behind':'ahead'}`}><strong>{plan.behindBy?`${formatDuration(plan.behindBy)} too much work`:`${formatDuration(plan.aheadBy)} breathing room`}</strong><span>{plan.clockOut?`Clock-out ${formatTime(plan.clockOut)}`:'Set clock-out for live guidance'}</span></div>{plan.items.map((item,i)=><article key={item.task.id}><span>{i+1}</span><div><strong>{item.task.title}</strong><small>{formatTime(item.start)}–{formatTime(item.finish)} · smart estimate {item.estimate.minutes}m</small></div><b>{item.allotted}m</b>{i===0&&<button onClick={()=>startFocus(item)}><Icon name="play" size={16}/></button>}</article>)}</div>}
    {planTab==='priority'&&<div className="sp-priority-list">{tasks.map(task=><article key={task.id}><div><strong>{task.title}</strong><small>{estimateTask(task,learning).minutes} min</small></div><div>{['urgent','high','normal','low'].map(p=><button key={p} disabled={task.priority==='required'} className={task.priority===p?'selected':''} onClick={()=>setData(current=>({...current,tasks:current.tasks.map(t=>t.id===task.id?{...t,priority:p}:t)}))}>{p}</button>)}</div></article>)}</div>}
    {planTab==='clock'&&<div className="sp-clock-settings"><label>Clock-out time<input type="time" value={prefs.clockOut?.[activeShift]||''} onChange={e=>setPrefs(current=>({...current,clockOut:{...current.clockOut,[activeShift]:e.target.value}}))}/></label><label>Available labor hours<input type="number" min="0" step=".25" value={data.shiftHours?.[activeShift]??''} onChange={e=>setData(current=>({...current,shiftHours:{...current.shiftHours,[activeShift]:Math.max(0,Number(e.target.value))}}))}/></label><p>Clock-out drives your live personal plan. Labor hours still show whether the shift workload fits the staffing available.</p></div>}
    {planTab==='interrupt'&&<div><button className="sp-log-interrupt" onClick={()=>setInterruptDraft({label:'Register backup',minutes:10,type:'register',fromFocus:false})}><Icon name="alert"/> Log an interruption</button><div className="sp-interrupt-list">{(data.interruptions||[]).filter(x=>x.shift===activeShift&&x.date===data.date).slice().reverse().map(x=><article key={x.id}><strong>{x.label}</strong><span>{x.minutes} min</span></article>)}</div></div>}
  </>;
}

function ManualSheet({title,setTitle,shift,onAdd,startVoice}) { return <><header className="sp-sheet-head"><span>ADD TASK</span><h2>What needs doing?</h2></header><label className="sp-field">Task name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: fill beer cooler" onKeyDown={e=>e.key==='Enter'&&onAdd()}/></label><div className="sp-sheet-actions"><button onClick={startVoice}><Icon name="mic"/> Voice</button><button className="primary" onClick={onAdd}><Icon name="plus"/> Add to {SHIFT_LABELS[shift]}</button></div></>; }
function SettingsSheet({exportBackup,importRef,resetToday}) { return <><header className="sp-sheet-head"><span>SETTINGS</span><h2>Data and backups</h2><p>Everything remains on this phone. Backups prevent browser cleanup from becoming an archaeological event.</p></header><button className="sp-settings-row" onClick={exportBackup}><Icon name="download"/><div><strong>Download backup</strong><small>Tasks, history, preferences, learned times</small></div><Icon name="chevron"/></button><button className="sp-settings-row" onClick={()=>importRef.current?.click()}><Icon name="upload"/><div><strong>Restore backup</strong><small>Load a ShiftPilot backup file</small></div><Icon name="chevron"/></button><button className="sp-settings-row" onClick={resetToday}><Icon name="alert"/><div><strong>Reset today's workspace</strong><small>Fresh start today, while keeping History and learned times</small></div><Icon name="chevron"/></button></>; }

function WalkSheet({task,toggle,complete}) {
  if(!task)return null; const top=task.walkItems.filter(x=>!x.parent);
  return <><header className="sp-sheet-head"><span>DAILY WALK</span><h2>{task.title}</h2></header><div className="sp-walk">{top.map(item=><section key={item.id}><button className={item.checked?'checked':''} onClick={()=>toggle(item.id)}><i>{item.checked&&<Icon name="check" size={15}/>}</i><strong>{item.label}</strong></button>{task.walkItems.filter(x=>x.parent===item.id).map(child=><button className={`child ${child.checked?'checked':''}`} key={child.id} onClick={()=>toggle(child.id)}><i>{child.checked&&<Icon name="check" size={14}/>}</i><span>{child.label}</span></button>)}</section>)}</div><button className="sp-wide-primary" onClick={complete}><Icon name="check"/> Complete walk</button></>;
}

function FocusMode({task,remainingSec,elapsedSec,running,togglePause,complete,skip,interruption,estimate}) {
  const mins=String(Math.floor(remainingSec/60)).padStart(2,'0'); const secs=String(remainingSec%60).padStart(2,'0'); const progress=Math.min(100,elapsedSec/(Math.max(1,elapsedSec+remainingSec))*100);
  return <div className="sp-focus"><div className="sp-focus-glow"/><span className="sp-focus-label">FOCUS MODE</span><h1>{task.title}</h1><p>{estimate.category} · personal pace updates when you finish</p><div className={`sp-timer ${remainingSec===0?'over':''}`}>{mins}:{secs}</div><div className="sp-focus-progress"><i style={{width:`${progress}%`}}/></div><div className="sp-focus-actions"><button onClick={togglePause}><Icon name={running?'pause':'play'}/><span>{running?'Pause':'Resume'}</span></button><button className="complete" onClick={complete}><Icon name="check"/><span>Complete</span></button><button onClick={interruption}><Icon name="alert"/><span>Interrupted</span></button></div><button className="sp-skip" onClick={skip}><Icon name="skip" size={18}/> Skip for now</button></div>;
}

function InterruptionModal({draft,setDraft,log,close}) { return <div className="sp-modal-bg"><section className="sp-interrupt-modal"><button className="sp-modal-close" onClick={close}><Icon name="close"/></button><span className="sp-kicker dark">INTERRUPTION</span><h2>What pulled you away?</h2><div className="sp-interruption-types">{INTERRUPTIONS.map(([label,minutes,type])=><button className={draft.type===type?'active':''} key={type} onClick={()=>setDraft(current=>({...current,label,minutes,type}))}>{label}</button>)}</div><label>Minutes<input type="number" min="1" value={draft.minutes} onChange={e=>setDraft(current=>({...current,minutes:Math.max(1,Number(e.target.value))}))}/></label><button className="sp-wide-primary" onClick={()=>log(draft)}>Log and recalculate</button></section></div>; }

function Confetti(){const pieces=Array.from({length:120},(_,i)=>({i,left:Math.random()*100,delay:Math.random()*.4,duration:1.5+Math.random()*1.2,color:['#0f766e','#14b8a6','#f4c95d','#ef8354','#4f46e5','#e11d48'][i%6]}));return <div className="sp-confetti">{pieces.map(p=><i key={p.i} style={{left:`${p.left}%`,animationDelay:`${p.delay}s`,animationDuration:`${p.duration}s`,background:p.color}}/>)}<div><strong>Shift complete</strong><span>Big confetti, as negotiated.</span></div></div>}
