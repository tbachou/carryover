import { useState } from 'react';

// Reused verbatim from Panel's ApiKeyScreen (src/renderer/src/components/ApiKeyScreen.tsx),
// per instruction to not reinvent the onboarding pattern — only the copy and
// window.carryover binding changed.
export function ApiKeyScreen({ onSaved }: { onSaved: () => void }) {
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await window.carryover.setApiKey(key);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="onboarding">
      <form className="onboarding__card" onSubmit={handleSubmit}>
        <h1>Carryover needs an Anthropic API key</h1>
        <p className="onboarding__body">
          Carryover calls the Anthropic API directly from your machine to draft handouts — there's
          no Carryover server in between. Your key is encrypted at rest using your OS's own
          credential store (Keychain on macOS) and never leaves this device except in direct calls
          to Anthropic.
        </p>
        <label htmlFor="api-key">API key</label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={isSaving}
        />
        {error ? <p className="onboarding__error">{error}</p> : null}
        <button className="primary" type="submit" disabled={isSaving || !key.trim()}>
          {isSaving ? 'Saving…' : 'Save and continue'}
        </button>
        <a
          className="onboarding__link"
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
        >
          Get a key from the Anthropic Console →
        </a>
      </form>
    </div>
  );
}
