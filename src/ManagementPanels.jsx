import { buildHandoffSuggestions, buildWeeklyManagerReport, getRecurringProblems, includeHandoffSuggestion, scopeForIssue } from './managementV3.js';

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
          <span>REPORT INTELLIGENCE</span>
          <h2>Manager report notes</h2>
          <p>Suggested notes are based on unfinished work, interruptions, and repeated issues for the selected shift.</p>
        </div>
        {remaining.length > 1 && <button onClick={includeAll}>Add all</button>}
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
                {suggestion.included ? 'Added' : 'Add'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mg-empty">Nothing urgent needs to be reported right now.</div>
      )}
    </section>
  );
}

export function ManagerInsights({ data, learning, share }) {
  const report = buildWeeklyManagerReport(data, learning);
  const recurring = getRecurringProblems(data, 2).slice(0, 6);
  const activeShift = data.activeShift || 'morning';

  return (
    <div className="mg-insights-stack">
      <section className="mg-weekly-card">
        <div className="mg-card-head">
          <div>
            <span>WEEKLY MANAGER REPORT</span>
            <h2>{report.days} day{report.days === 1 ? '' : 's'} documented</h2>
            <p>A running record of the selected shift, completed work, unfinished work, and interruptions.</p>
          </div>
          <button onClick={() => share('Weekly Manager Report', report.text)}>Share</button>
        </div>

        <div className="mg-metrics">
          <article><span>Completed</span><strong>{report.completed}</strong></article>
          <article><span>Unfinished</span><strong>{report.unfinished}</strong></article>
          <article><span>Reported</span><strong>{report.reported ?? report.handedOff}</strong></article>
          <article><span>Interruptions</span><strong>{report.interruptionMinutes}m</strong></article>
        </div>
      </section>

      <section className="mg-problem-card">
        <div className="mg-card-head">
          <div>
            <span>RECURRING PROBLEM TRACKER</span>
            <h2>Recurring problems</h2>
            <p>These are patterns to review or report. They are not automatic assignments for all shifts.</p>
          </div>
        </div>

        {recurring.length ? (
          <div className="mg-problem-list">
            {recurring.map(issue => {
              const scope = issue.scope || scopeForIssue(issue, activeShift);
              return (
                <article key={issue.key} className={`mg-problem-${scope.tone || 'store'}`}>
                  <div>
                    <strong>{issue.category}</strong>
                    <small>{issue.examples.join(' · ')}</small>
                    <em>{issue.action}</em>
                  </div>
                  <span>{scope.label}</span>
                  <b>{issue.days} days</b>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mg-empty">No repeated problems yet. The tracker needs at least two documented days before it starts showing patterns.</div>
        )}
      </section>
    </div>
  );
}
