import { useEffect, useState } from 'react';
import { getAllProducts, addProduct, deleteProduct, requestDeleteOtp } from './api';

type Product = {
  product_id: number;
  name: string;
  price: string;
  barcode: string;
  quantity_in_stock: number;
};

function formatWithCommas(value: string) {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('en-NG');
}
function stripCommas(value: string) {
  return value.replace(/,/g, '');
}

export default function Inventory({ role }: { role: string }) {
  const isManager = role === 'manager';

  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [otpProductId, setOtpProductId] = useState<number | null>(null);
  const [otpProductName, setOtpProductName] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  async function load() {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch {
      setError("Couldn't load your products. Check your connection and try again.");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    setError(''); setSuccess('');
    if (!name.trim()) { setError('Give the product a name.'); return; }
    if (!price) { setError('Enter a price.'); return; }
    if (!barcode.trim()) { setError('Enter or scan a barcode.'); return; }
    if (!qty) { setError('Enter how many are in stock.'); return; }

    try {
      await addProduct({
        name: name.trim(),
        price: Number(stripCommas(price)),
        barcode: barcode.trim(),
        quantity_in_stock: Number(stripCommas(qty)),
        expiry_date: '2027-01-01',
        supplier_id: 1,
      });
      setName(''); setPrice(''); setBarcode(''); setQty('');
      setSuccess(`${name.trim()} was added.`);
      load();
    } catch (err: any) {
      setError(err.message || 'Could not add this product. Please try again.');
    }
  }

  async function startDelete(id: number, productName: string) {
    try {
      await requestDeleteOtp(id);
      setOtpProductId(id);
      setOtpProductName(productName);
      setOtpValue('');
      setOtpError('');
    } catch (err: any) {
      setError(err.message || 'Could not send the code.');
    }
  }

  async function confirmDelete() {
    if (!otpProductId) return;
    try {
      await deleteProduct(otpProductId, otpValue);
      setOtpProductId(null);
      load();
    } catch (err: any) {
      setOtpError(err.message || 'Could not delete this product.');
    }
  }

  const lowStockCount = products.filter(p => p.quantity_in_stock <= 5).length;

  return (
    <div style={{ padding: 24, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: 'var(--ink)' }}>📦 Inventory</h1>
        {lowStockCount > 0 && (
          <span style={pillBadge}>⚠ {lowStockCount} low stock</span>
        )}
      </div>

      {isManager ? (
        <div style={formCard}>
          <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', fontSize: 15 }}>➕ Add a product</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input placeholder="Price" inputMode="numeric" value={price} onChange={(e) => setPrice(formatWithCommas(e.target.value))} style={inputStyle} />
            <input placeholder="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} style={inputStyle} />
            <input placeholder="Quantity in stock" inputMode="numeric" value={qty} onChange={(e) => setQty(formatWithCommas(e.target.value))} style={inputStyle} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
          {success && <p style={{ color: 'var(--mint)', fontSize: 13, marginTop: 10 }}>✓ {success}</p>}
          <button onClick={handleAdd} style={primaryBtn}>Add product</button>
        </div>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          👀 Only managers can add or remove products. You can still view current stock below.
        </p>
      )}

      <div style={tableCard}>
        <div style={{ ...rowStyle, background: 'var(--bg)', fontWeight: 600, fontSize: 12.5, color: 'var(--muted)' }}>
          <span style={{ flex: 2 }}>Name</span>
          <span style={{ flex: 1 }}>Price</span>
          <span style={{ flex: 1.4 }}>Barcode</span>
          <span style={{ flex: 1 }}>Stock</span>
          {isManager && <span style={{ width: 80 }}></span>}
        </div>
        {products.map((p) => (
          <div key={p.product_id} style={rowStyle}>
            <span style={{ flex: 2, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</span>
            <span style={{ flex: 1, color: 'var(--ink)' }}>₦{Number(p.price).toLocaleString()}</span>
            <span style={{ flex: 1.4, color: 'var(--muted)', fontSize: 13 }}>{p.barcode}</span>
            <span style={{ flex: 1, color: p.quantity_in_stock <= 5 ? 'var(--danger)' : 'var(--ink)', fontWeight: p.quantity_in_stock <= 5 ? 700 : 500 }}>
              {p.quantity_in_stock} {p.quantity_in_stock <= 5 && '⚠'}
            </span>
            {isManager && (
              <span style={{ width: 80 }}>
                <button onClick={() => startDelete(p.product_id, p.name)} style={deleteBtn}>Remove</button>
              </span>
            )}
          </div>
        ))}
        {products.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No products yet.</div>}
      </div>

      {otpProductId && (
        <div className="success-overlay">
          <div className="success-card" style={{ textAlign: 'left', width: 300 }}>
            <h3 style={{ marginBottom: 4 }}>Confirm deletion</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              A code was sent to your email to confirm removing <b>{otpProductName}</b>.
            </p>
            <input placeholder="Enter code" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} style={inputStyle} />
            {otpError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{otpError}</p>}
            <button onClick={confirmDelete} style={primaryBtn}>Confirm delete</button>
            <button
              onClick={() => setOtpProductId(null)}
              style={{ width: '100%', marginTop: 8, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const formCard: React.CSSProperties = { background: 'var(--surface)', padding: 20, borderRadius: 18, marginBottom: 22, maxWidth: 560, border: '1px solid var(--line)', boxShadow: '0 18px 40px -24px rgba(23,22,35,.2)' };
const inputStyle: React.CSSProperties = { padding: 11, borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, color: 'var(--ink)', width: '100%', marginBottom: 10 };
const primaryBtn: React.CSSProperties = { marginTop: 4, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' };
const tableCard: React.CSSProperties = { background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 14 };
const deleteBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const pillBadge: React.CSSProperties = { background: 'var(--amber)', color: 'white', padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700 };