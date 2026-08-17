import type { HandoutDraft } from '@shared/types';

export function HistorySidebar({
  history,
  onSelect,
  onClearKey,
  onClearHistory,
  onNewDraft,
}: {
  history: HandoutDraft[];
  onSelect: (draft: HandoutDraft) => void;
  onClearKey: () => void;
  onClearHistory: () => void;
  onNewDraft: () => void;
}) {
  return (
    <aside className="sidebar">
      <h1 className="sidebar__title">Carryover</h1>
      <p className="sidebar__subtitle">HEP drafting aid for OT/PT clinicians</p>
      <button className="sidebar__new" onClick={onNewDraft}>
        New case profile
      </button>
      <div className="sidebar__history">
        <div className="sidebar__history-head">
          <h2>Draft history</h2>
          {history.length > 0 ? (
            <button className="sidebar__clear-history" onClick={onClearHistory}>
              Clear
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="sidebar__empty">No drafts yet.</p>
        ) : (
          <ul>
            {history.map((draft) => (
              <li key={draft.id}>
                <button onClick={() => onSelect(draft)}>
                  <span className="history-repo">{summarize(draft.caseProfile.presentation)}</span>
                  <span className="history-meta">
                    {draft.exercises.length} exercise{draft.exercises.length === 1 ? '' : 's'} ·{' '}
                    {new Date(draft.createdAt).toLocaleString()}
                    {draft.signedOff ? ' · signed off' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="sidebar__change-key" onClick={onClearKey}>
        Change API key
      </button>
    </aside>
  );
}

function summarize(presentation: string): string {
  const trimmed = presentation.trim();
  if (!trimmed) return 'Untitled case';
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}
