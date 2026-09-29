import { useEffect, useState } from 'react';
import { getEodSummary, submitEod } from './api';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function EndOfDay({ role }: { role: string }) {
  const [summary, setSummary] = useState<{ total_sales: number; total_transactions: number } | null>(null);
  const [satisfied, setSatisfied] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getEodSummary(todayStr())
      .then((data) => setSummary({ total_sales: Number(data.total_sales), total_transactions: data.total_transactions }))
      .catch((err) => setError(err.message || "Couldn't load today's numbers."));
  }, []);

  async function handleSubmit() {
    setError('');
    try {
      await submitEod({ date: todayStr(), satisfied_customers: Number(satisfied || 0), notes });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Could not submit your report.');
    }
  }

  if (submitted) {
    return (
      <div style={{ padding: 24, position: 'relative', zIndex: 1, maxWidth: 480 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, textAlign: 'center' }}>✅</div>
          <h2 style={{ textAlign: 'center', color: 'var(--ink)' }}>Shift closed</h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
            {role === 'manager'
              ? "Your end of day report is recorded, ready for the owner to review."
              : 'Your end of day report has been sent to your manager.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, position: 'relative', zIndex: 1, maxWidth: 480 }}>
      <h1 style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>🌙 You're about to close your shift</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 18 }}>
        Here's how today went. Fill in the rest before you go.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={statLabel}>💰 Sales today</div>
          <div style={statNumber}>₦{summary ? summary.total_sales.toLocaleString() : '—'}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>🧾 Transactions</div>
          <div style={statNumber}>{summary ? summary.total_transactions : '—'}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>How many customers seemed satisfied today?</label>
        <input
          inputMode="numeric"
          value={satisfied}
          onChange={(e) => setSatisfied(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="e.g. 24"
          style={inputStyle}
        />

        <label style={labelStyle}>Notes for {role === 'manager' ? 'the owner' : 'your manager'}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth mentioning: low stock, a difficult customer, anything unusual..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />

        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

        <button onClick={handleSubmit} style={primaryBtn}>
          {role === 'manager' ? 'Submit day to owner' : 'Submit shift to manager'}
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'var(--surface)', padding: 20, borderRadius: 18, border: '1px solid var(--line)', boxShadow: '0 18px 40px -24px rgba(23,22,35,.2)' };
const statCard: React.CSSProperties = { background: 'var(--surface)', padding: 16, borderRadius: 14, flex: 1, border: '1px solid var(--line)' };
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 };
const statNumber: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: 'var(--ink)' };
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginTop: 12, marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 11, borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)' };
const primaryBtn: React.CSSProperties = { marginTop: 16, width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer' };