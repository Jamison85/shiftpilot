import { buildHandoffSuggestions, buildWeeklyManagerReport, getRecurringProblems, includeHandoffSuggestion } from './managementV3.js';

export function DayTemplateBanner({ data }) {
  const templateTasks = (data.tasks || []).filter(task => task.type === 'template');
  if (!data.templateName || !templateTasks.length) return null;

  return (
    <section className="mg-template-card">
      <div>
        <span>TODAY'S TEMPLATE</span>
        <strong>{data.templateName}</strong>
        <small>{templateTasks.length} day-specific task{templateTasks.length === 1 ? '' : 's'} loaded automatically</small>
      </div>
      <div className="mg-template-count">{templateTasks.length}</div>
    </section>
  );
}

export function HandoffIntelligence({ data, activeShift, setData }) {
  const suggestions = buildHandoffSuggestions(data, activeShift);
  const remaining = suggestions.filter(item => !item.included);

  const includeOne = suggestion => {
    setData(current => includeHandoffSuggestion(current, activeShift, suggestion));
  };

  const includeAll = () => {
    setData(current => remaining.reduce(
      (next, suggestion) => includeHandoffSuggestion(next, activeShift, suggestion),
      current,
    ));
  };

  return (
    <section className="mg-handoff-card">
      <div className="mg-card-head">
        <div>
          <span>HANDOFF INTELLIGENCE</span>
          <h2>ShiftPilot noticed</h2>
          <p>Suggested items are based on priority, skipped work, interruptions, and repeated problems.</p>
        </div>
        {remaining.length > 1 && <button onClick={includeAll}>Include all</button>}
      </div>

      {suggestions.length ? (
        <div className="mg-suggestion-list">
          {suggestions.map(suggestion => (
            <article key={suggestion.id} className={suggestion.included ? 'included' : ''}>
              <div>
                <strong>{suggestion.title}</strong>
                <small>{suggestion.reason}</small>
              </div>
              <button disabled={suggestion.included} onClick={() => includeOne(suggestion)}>
                {suggestion.included ? 'Included' : 'Add'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mg-empty">Nothing urgent is asking for a handoff. A suspiciously civilized shift.</div>
      )}
    </section>
  );
}

export function ManagerInsights({ data, learning, share }) {
  const report = buildWeeklyManagerReport(data, learning);
  const recurring = getRecurringProblems(data, 2).slice(0, 6);

  return (
    <div className="mg-insights-stack">
      <section className="mg-weekly-card">
        <div className="mg-card-head">
          <div>
            <span>WEEKLY MANAGER REPORT</span>
            <h2>{report.days} day{report.days === 1 ? '' : 's'} documented</h2>
            <p>A running record of what got done and what kept getting in the way.</p>
          </div>
          <button onClick={() => share('Weekly Manager Report', report.text)}>Share</button>
        </div>

        <div className="mg-metrics">
          <article><span>Completed</span><strong>{report.completed}</strong></article>
          <article><span>Unfinished</span><strong>{report.unfinished}</strong></article>
          <article><span>Handed off</span><strong>{report.handedOff}</strong></article>
          <article><span>Interruptions</span><strong>{report.interruptionMinutes}m</strong></article>
        </div>
      </section>

      <section className="mg-problem-card">
        <div className="mg-card-head">
          <div>
            <span>RECURRING PROBLEM TRACKER</span>
            <h2>Patterns, not random annoyances</h2>
            <p>Problems appear here after they show up on at least two different days.</p>
          </div>
        </div>

        {recurring.length ? (
          <div className="mg-problem-list">
            {recurring.map(issue => (
              <article key={issue.key}>
                <div>
                  <strong>{issue.category}</strong>
                  <small>{issue.examples.join(' · ')}</small>
                </div>
                <span>{issue.days} days</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="mg-empty">No repeated problems yet. The tracker needs at least two documented days before it starts judging the store.</div>
        )}
      </section>
    </div>
  );
}
