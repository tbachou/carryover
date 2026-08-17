import { useEffect, useState } from 'react';
import type { AgentId, AgentProgress, AgentStatus, CaseProfile, HandoutDraft } from '@shared/types';
import { AGENT_LABELS } from '@shared/types';
import { AgentStatusRow } from './components/AgentStatusRow';
import { ApiKeyScreen } from './components/ApiKeyScreen';
import { CaseProfileForm } from './components/CaseProfileForm';
import { DraftHandoutView } from './components/DraftHandoutView';
import { HistorySidebar } from './components/HistorySidebar';

type KeyStatus = 'checking' | 'missing' | 'present';

const AGENTS: AgentId[] = ['exerciseSelection', 'safetyReview', 'patientInstructions'];
const INITIAL_STATUSES: Record<AgentId, AgentStatus> = {
  exerciseSelection: 'pending',
  safetyReview: 'pending',
  patientInstructions: 'pending',
};

export default function App() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('checking');

  useEffect(() => {
    void window.carryover.hasApiKey().then((present) => setKeyStatus(present ? 'present' : 'missing'));
  }, []);

  return (
    <div className="app-shell">
      <div className="titlebar" />
      {keyStatus === 'checking' ? null : keyStatus === 'missing' ? (
        <ApiKeyScreen onSaved={() => setKeyStatus('present')} />
      ) : (
        <DraftingApp onClearKey={() => setKeyStatus('missing')} />
      )}
    </div>
  );
}

function DraftingApp({ onClearKey }: { onClearKey: () => void }) {
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>(INITIAL_STATUSES);
  const [draft, setDraft] = useState<HandoutDraft | null>(null);
  const [history, setHistory] = useState<HandoutDraft[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    void window.carryover.getHistory().then(setHistory);
    return window.carryover.onAgentProgress((progress: AgentProgress) => {
      setStatuses((prev) => ({ ...prev, [progress.agent]: progress.status }));
    });
  }, []);

  async function handleSubmitProfile(profile: CaseProfile) {
    setError(null);
    setIsDrafting(true);
    setDraft(null);
    setStatuses(INITIAL_STATUSES);
    setShowForm(false);
    try {
      const result = await window.carryover.draftHandout(profile);
      setDraft(result);
      setHistory((prev) => [result, ...prev.filter((d) => d.id !== result.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setShowForm(true);
    } finally {
      setIsDrafting(false);
    }
  }

  function handleToggleAccept(exerciseId: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) => (e.id === exerciseId ? { ...e, accepted: !e.accepted } : e)),
          }
        : prev,
    );
  }

  async function handleSignOff() {
    if (!draft) return;
    const signed = await window.carryover.signOff(draft);
    setDraft(signed);
    setHistory((prev) => [signed, ...prev.filter((d) => d.id !== signed.id)]);
  }

  async function handleClearKey() {
    await window.carryover.clearApiKey();
    onClearKey();
  }

  async function handleClearHistory() {
    await window.carryover.clearHistory();
    setHistory([]);
  }

  return (
    <div className="app">
      <HistorySidebar
        history={history}
        onClearKey={handleClearKey}
        onClearHistory={handleClearHistory}
        onNewDraft={() => {
          setDraft(null);
          setShowForm(true);
          setError(null);
        }}
        onSelect={(selected) => {
          setDraft(selected);
          setShowForm(false);
          setError(null);
        }}
      />
      <main className="main">
        {error ? <div className="error-banner">{error}</div> : null}

        {showForm ? (
          <CaseProfileForm onSubmit={handleSubmitProfile} isSubmitting={isDrafting} />
        ) : (
          <>
            {isDrafting || draft ? (
              <div className="agent-row">
                {AGENTS.map((agent) => (
                  <AgentStatusRow key={agent} label={AGENT_LABELS[agent]} status={statuses[agent]} />
                ))}
              </div>
            ) : null}
            {draft ? (
              <DraftHandoutView draft={draft} onToggleAccept={handleToggleAccept} onSignOff={handleSignOff} />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
