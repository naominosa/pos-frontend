import { useEffect, useState } from 'react';
import { getSalesByDate, voidSale, getStaffList, createStaff,getEodReports } from './api';

type SaleRow = {
  sale_id: number;
  total_amount: string;
  payment_type: string;
  created_at: string;
  staff?: { name: string };
  items: { quantity: number }[];
};

type StaffRow = { staff_id: number; name: string; role: string; login_info: string; };

function todayStr() { return new Date().toISOString().slice(0, 10); }
function shiftDate(dateStr: string, delta: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
function friendlyDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
const PAYMENT_ICON: Record<string, string> = { Cash: '💵', Card: '💳', Transfer: '🔁' };

export default function ManagerDashboard() {
  const [date, setDate] = useState(todayStr());
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState('');

  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'cashier' | 'manager'>('cashier');
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [eodReports, setEodReports] = useState<any[]>([]);

  async function load(d: string) {
    setError('');
    try {
      const data = await getSalesByDate(d);
      setSales(data.sales);
      setTotalRevenue(Number(data.total_revenue));
    } catch (err: any) {
      setError(err.message || "Couldn't load sales for that day.");
    }
  }

  async function loadStaff() {
    try {
      const data = await getStaffList();
      setStaffList(data);
    } catch (err: any) {
      setStaffError(err.message || "Couldn't load your team.");
    }
  }

  // useEffect(() => { load(date); loadStaff(); }, [date]);

  useEffect(() => { load(date); loadStaff(); getEodReports(date).then(setEodReports).catch(() => {}); }, [date]);

  async function handleVoid(saleId: number) {
    if (!confirm('Void this sale? This cannot be undone.')) return;
    try {
      await voidSale(saleId);
      load(date);
    } catch (err: any) {
      setError(err.message || 'Could not void this sale.');
    }
  }

  async function handleAddStaff() {
    setStaffError(''); setStaffSuccess('');
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setStaffError('Fill in name, email, and password.');
      return;
    }
    try {
      await createStaff({ name: newName.trim(), login_info: newEmail.trim(), role: newRole, password: newPassword });
      setStaffSuccess(`${newName.trim()} was added as a ${newRole}.`);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('cashier');
      loadStaff();
    } catch (err: any) {
      setStaffError(err.message || 'Could not add this employee.');
    }
  }

  return (
    <div style={{ padding: 24, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button onClick={() => setDate(shiftDate(date, -1))} style={navBtn}>← Prev</button>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--ink)' }}>📅 {friendlyDate(date)}</h1>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr()} style={{ ...navBtn, opacity: date >= todayStr() ? 0.4 : 1 }}>Next →</button>
        {date !== todayStr() && (
          <button onClick={() => setDate(todayStr())} style={{ ...navBtn, marginLeft: 'auto', background: 'var(--select-soft)', color: 'var(--select)', borderColor: 'var(--select-soft)' }}>Jump to today</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={statCard}>
          <div style={statLabel}>💰 Total revenue</div>
          <div style={{ ...statNumber, background: 'linear-gradient(90deg, var(--accent), var(--accent-dark))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as any}>
            ₦{totalRevenue.toLocaleString()}
          </div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>🧾 Sales made</div>
          <div style={statNumber}>{sales.length}</div>
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

      <div style={tableCard}>
        <div style={{ ...rowStyle, background: 'var(--bg)', fontWeight: 600, fontSize: 12.5, color: 'var(--muted)' }}>
          <span style={{ flex: 1 }}>Time</span>
          <span style={{ flex: 1.2 }}>Cashier</span>
          <span style={{ flex: 0.8 }}>Items</span>
          <span style={{ flex: 1 }}>Payment</span>
          <span style={{ flex: 1 }}>Total</span>
          <span style={{ width: 70 }}></span>
        </div>
        {sales.map((sale) => (
          <div key={sale.sale_id} style={rowStyle}>
            <span style={{ flex: 1, color: 'var(--ink)' }}>{new Date(sale.created_at).toLocaleTimeString()}</span>
            <span style={{ flex: 1.2, color: 'var(--ink)', fontWeight: 600 }}>{sale.staff?.name || '—'}</span>
            <span style={{ flex: 0.8, color: 'var(--ink)' }}>{sale.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
            <span style={{ flex: 1, color: 'var(--ink)' }}>{PAYMENT_ICON[sale.payment_type] || ''} {sale.payment_type}</span>
            <span style={{ flex: 1, fontWeight: 700, color: 'var(--ink)' }}>₦{Number(sale.total_amount).toLocaleString()}</span>
            <span style={{ width: 70 }}>
              <button onClick={() => handleVoid(sale.sale_id)} style={voidBtn}>Void</button>
            </span>
          </div>
        ))}
        {sales.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No sales recorded for this day.</div>}
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 14 }}>👥 Team</h2>

        <div style={formCard}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14.5, color: 'var(--ink)' }}>➕ Add an employee</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            <input placeholder="Email (used to log in)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'cashier' | 'manager')} style={inputStyle}>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {staffError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{staffError}</p>}
          {staffSuccess && <p style={{ color: 'var(--mint)', fontSize: 13, marginTop: 10 }}>✓ {staffSuccess}</p>}
          <button onClick={handleAddStaff} style={primaryBtn}>Add employee</button>
        </div>

        <div style={tableCard}>
          <div style={{ ...rowStyle, background: 'var(--bg)', fontWeight: 600, fontSize: 12.5, color: 'var(--muted)' }}>
            <span style={{ flex: 1.4 }}>Name</span>
            <span style={{ flex: 1 }}>Role</span>
            <span style={{ flex: 1.4 }}>Email</span>
          </div>
          {staffList.map((s) => (
            <div key={s.staff_id} style={rowStyle}>
              <span style={{ flex: 1.4, fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span>
              <span style={{ flex: 1, color: 'var(--ink)', textTransform: 'capitalize' }}>{s.role === 'manager' ? '📊' : '🛒'} {s.role}</span>
              <span style={{ flex: 1.4, color: 'var(--muted)', fontSize: 13 }}>{s.login_info}</span>
            </div>
          ))}
          {staffList.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No team members yet.</div>}
        </div>

        <div style={{ marginTop: 32 }}>
  <h2 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 14 }}>🌙 End of day reports</h2>
  <div style={tableCard}>
    <div style={{ ...rowStyle, background: 'var(--bg)', fontWeight: 600, fontSize: 12.5, color: 'var(--muted)' }}>
      <span style={{ flex: 1.2 }}>Staff</span>
      <span style={{ flex: 1 }}>Sales</span>
      <span style={{ flex: 0.8 }}>Sales made</span>
      <span style={{ flex: 0.8 }}>Satisfied</span>
      <span style={{ flex: 2 }}>Notes</span>
    </div>
    {eodReports.map((r: any) => (
      <div key={r.eod_id} style={rowStyle}>
        <span style={{ flex: 1.2, fontWeight: 600, color: 'var(--ink)' }}>{r.staff?.name} ({r.role})</span>
        <span style={{ flex: 1, color: 'var(--ink)' }}>₦{Number(r.total_sales).toLocaleString()}</span>
        <span style={{ flex: 0.8, color: 'var(--ink)' }}>{r.total_transactions}</span>
        <span style={{ flex: 0.8, color: 'var(--ink)' }}>{r.satisfied_customers ?? '—'}</span>
        <span style={{ flex: 2, color: 'var(--muted)', fontSize: 13 }}>{r.notes || '—'}</span>
      </div>
    ))}
    {eodReports.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No reports submitted for this day yet.</div>}
  </div>
</div>
      </div>
    </div>
  );
}

const formCard: React.CSSProperties = { background: 'var(--surface)', padding: 20, borderRadius: 18, marginBottom: 22, maxWidth: 560, border: '1px solid var(--line)', boxShadow: '0 18px 40px -24px rgba(23,22,35,.2)' };
const inputStyle: React.CSSProperties = { padding: 11, borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, color: 'var(--ink)' };
const primaryBtn: React.CSSProperties = { marginTop: 14, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' };
const navBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontWeight: 600 };
const statCard: React.CSSProperties = { background: 'var(--surface)', padding: 18, borderRadius: 16, flex: 1, minWidth: 180, border: '1px solid var(--line)', boxShadow: '0 18px 40px -24px rgba(23,22,35,.2)' };
const statLabel: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 };
const statNumber: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: 'var(--ink)' };
const tableCard: React.CSSProperties = { background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 14 };
const voidBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 600 };