import { useState, useEffect } from 'react';
import BarcodeScanner from './components/BarcodeScanner';
// import { login, getProductByBarcode, createSale, saveToken, addProduct } from './api';
import Inventory from './Inventory';
import Receipt from './components/Receipt';
import type { ReceiptData } from './components/Receipt';
import ManagerDashboard from './ManagerDashboard';
import EndOfDay from './EndOfDay';
import Assistant from './components/Assistant';
import { cacheProducts, getCachedProducts, updateCachedProductStock, queueSale, getPendingSales, removePendingSale, } from './offline';
import type { PendingSale } from './offline';
import { getAllProducts } from './api';
import { login, getProductByBarcode, createSale, saveToken, addProduct, lookupExternalProduct, clearToken ,searchProducts } from './api';
import './App.css';

type CartItem = { product_id: number; name: string; price: number; qty: number; };

const MOODS = [
  { key: 'spark', emoji: '⚡', title: 'Feeling great', vibe: 'Bring the energy', pick: '#FF5A6E', soft: '#FFF0F1' },
  { key: 'chill', emoji: '🌿', title: 'Chill vibes', vibe: 'Keep it easy', pick: '#16C79A', soft: '#E4FBF3' },
  { key: 'focus', emoji: '🎯', title: 'In the zone', vibe: 'Heads down today', pick: '#6C5CE7', soft: '#EFEDFF' },
  { key: 'cozy', emoji: '🌙', title: 'Running low', vibe: 'Take it slow', pick: '#E87FA0', soft: '#FBEEF3' },
];

const MOOD_BANNER: Record<string, string> = {
  spark: '⚡ Feeling great today, bring the energy',
  chill: '🌿 Chill vibes today, keep it easy',
  focus: '🎯 In the zone today, heads down, let\'s move',
  cozy: '🌙 Running low today, take it slow, we\'ve got you',
};

function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Working late';
}

function App() {
  const [screen, setScreen] = useState<'login' | 'mood' | 'checkout'>('login');
  const [email, setEmail] = useState('naomi@omie.com');
  const [password, setPassword] = useState('secret123');
  const [staffId, setStaffId] = useState<number | null>(null);
  const [staffName, setStaffName] = useState('');
  const [loginError, setLoginError] = useState('');

  const [chosenMood, setChosenMood] = useState<string | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [payment, setPayment] = useState<string | null>(null);
  const [saleDone, setSaleDone] = useState(false);

 const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<any[]>([]);

const [isOnline, setIsOnline] = useState(navigator.onLine);
const [pendingCount, setPendingCount] = useState(getPendingSales().length);

  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickQty, setQuickQty] = useState('10');

  const [role, setRole] = useState<string>('cashier');

  const [autoFilled, setAutoFilled] = useState(false);

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [tab, setTab] = useState<'checkout' | 'inventory' | 'manager' | 'eod'>('checkout');

  async function handleLogin() {
    setLoginError('');
    try {
      const data = await login(email, password);
      saveToken(data.token);
      setStaffId(data.staff.staff_id);
      setStaffName(data.staff.name);
      setRole(data.staff.role);
      setScreen('mood');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  }

  function handleLogout() {
  clearToken();
  document.body.removeAttribute('data-theme');
  setScreen('login');
  setStaffId(null);
  setStaffName('');
  setRole('cashier');
  setChosenMood(null);
  setPickedIndex(null);
  setCart([]);
  setPayment(null);
  setTab('checkout');
}
useEffect(() => {
  if (!searchQuery.trim()) { setSearchResults([]); return; }
  if (!isOnline) {
    const results = getCachedProducts().filter((p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
    return;
  }
  const timeout = setTimeout(() => {
    searchProducts(searchQuery).then(setSearchResults).catch(() => setSearchResults([]));
  }, 300);
  return () => clearTimeout(timeout);
}, [searchQuery, isOnline]);

// function addProductToCart(product: any) {
//   setCart((prev) => {
//     const existing = prev.find((i) => i.product_id === product.product_id);
//     if (existing) {
//       return prev.map((i) => i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i);
//     }
//     return [...prev, { product_id: product.product_id, name: product.name, price: Number(product.price), qty: 1 }];
//   });
//   setSearchQuery('');
//   setSearchResults([]);
// }

  function selectMood(index: number) {
    setPickedIndex(index);
    setChosenMood(MOODS[index].key);
  }

  async function syncPendingSales() {
  const pending = getPendingSales();
  for (const sale of pending) {
    try {
      await createSale(sale);
      removePendingSale(sale.local_id);
    } catch {
      break;
    }
  }
  setPendingCount(getPendingSales().length);
  getAllProducts().then(cacheProducts).catch(() => {});
}

useEffect(() => {
  function handleOnline() { setIsOnline(true); syncPendingSales(); }
  function handleOffline() { setIsOnline(false); }
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

  function startShift() {
    if (!chosenMood) return;
    document.body.setAttribute('data-theme', chosenMood);
    setScreen('checkout');
      getAllProducts().then(cacheProducts).catch(() => {}); // NEW

  }

  async function handleScan(code: string) {
  setShowScanner(false);
  setScanError('');
  if (code.length > 40 || code.startsWith('http')) {
    setScanError("That doesn't look like a product barcode.");
    setTimeout(() => setScanError(''), 6000);
    return;
  }

  if (!isOnline) {
    const product = getCachedProducts().find((p: any) => p.barcode === code);
    if (product) {
      addToCartFromProduct(product);
    } else {
      setScanError("Can't find that item offline. New products need internet.");
      setTimeout(() => setScanError(''), 6000);
    }
    return;
  }

  try {
    const product = await getProductByBarcode(code);
    addToCartFromProduct(product);
  } catch (err: any) {
    if (err.status === 404) {
      setUnknownBarcode(code);
      setQuickName('');
      setAutoFilled(false);
      try {
        const info = await lookupExternalProduct(code);
        if (info.found && info.name) {
          setQuickName(info.brand ? `${info.name} (${info.brand})` : info.name);
          setAutoFilled(true);
        }
      } catch {}
    } else {
      setScanError(err.message || "Couldn't look up that product");
      setTimeout(() => setScanError(''), 6000);
    }
  }
}

  async function handleQuickRegister() {
    if (!quickName.trim() || !quickPrice) {
      setScanError('Enter a name and price to register this product.');
      setTimeout(() => setScanError(''), 6000);
      return;
    }
    try {
      const product = await addProduct({
        name: quickName.trim(),
        price: Number(quickPrice.replace(/,/g, '')),
        barcode: unknownBarcode!,
        quantity_in_stock: Number(quickQty || '0'),
        expiry_date: '2027-01-01',
        supplier_id: 1,
      });
      setCart((prev) => [...prev, { product_id: product.product_id, name: product.name, price: Number(product.price), qty: 1 }]);
      setUnknownBarcode(null);
      setQuickName(''); setQuickPrice(''); setQuickQty('10');
    } catch (err: any) {
      setScanError(err.message || 'Could not register this product.');
      setTimeout(() => setScanError(''), 6000);
    }
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) => prev.map((i) => i.product_id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  }

  function addToCartFromProduct(product: any) {
  setCart((prev) => {
    const existing = prev.find((i) => i.product_id === product.product_id);
    if (existing) {
      return prev.map((i) => i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i);
    }
    return [...prev, { product_id: product.product_id, name: product.name, price: Number(product.price), qty: 1 }];
  });
}

  async function completeSale() {
  if (cart.length === 0) {
    setScanError('Add at least one item before completing the sale.');
    setTimeout(() => setScanError(''), 6000);
    return;
  }
  if (!payment) {
    setScanError('Choose a payment method to continue.');
    setTimeout(() => setScanError(''), 6000);
    return;
  }
  if (!staffId) return;

  const items = cart.map((i) => ({ product_id: i.product_id, quantity: i.qty, price_at_sale: i.price }));

  if (!isOnline) {
    const localId = `local-${Date.now()}`;
    const pendingSale: PendingSale = {
      local_id: localId,
      staff_id: staffId,
      total_amount: total,
      payment_type: payment,
      items,
      created_at: new Date().toISOString(),
    };
    queueSale(pendingSale);
    cart.forEach((i) => updateCachedProductStock(i.product_id, i.qty));
    setPendingCount(getPendingSales().length);

    setReceipt({
      saleId: 0,
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      total,
      payment,
      cashier: staffName,
      date: new Date().toISOString(),
      pending: true,
    });
    setSaleDone(true);
    setCart([]);
    setPayment(null);
    return;
  }

  try {
    const sale = await createSale({ staff_id: staffId, total_amount: total, payment_type: payment, items });
    setReceipt({
      saleId: sale.sale_id,
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      total,
      payment,
      cashier: staffName,
      date: new Date().toISOString(),
    });
    setSaleDone(true);
    setCart([]);
    setPayment(null);
  } catch (err: any) {
    setScanError(err.message || 'Could not save sale');
  }
}

  if (screen === 'login') {
    return (
      <div className="center-screen">
        <div className="blob-field"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></div>
        <div className="auth-card">
          <h1>{timeGreeting()}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 22 }}>Sign in to start your shift</p>
          <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {loginError && <p className="error-text">{loginError}</p>}
          <button className="primary-btn" onClick={handleLogin}>Sign in</button>
        </div>
      </div>
    );
  }

  if (screen === 'mood') {
    return (
      <div className="center-screen">
        <div className="blob-field"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></div>
        <div className="mood-card">
          <h2>{timeGreeting()}, {staffName}</h2>
          <p className="sub">How are you feeling today? We'll set the mood.</p>
          <div className="mood-grid">
            {MOODS.map((m, i) => (
              <div
                key={m.key}
                className={`mood-option ${pickedIndex === i ? 'picked' : ''}`}
                style={pickedIndex === i ? { ['--pick-color' as any]: m.pick, ['--pick-soft' as any]: m.soft } : undefined}
                onClick={() => selectMood(i)}
              >
                <span className="memoji">{m.emoji}</span>
                <div className="mtitle">{m.title}</div>
                <div className="mvibe">{m.vibe}</div>
              </div>
            ))}
          </div>
          <button className={`mood-continue ${chosenMood ? 'ready' : ''}`} onClick={startShift}>Start shift</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="top-nav">
  <div className="brand">
    <div className="brand-mark">O</div>
    <div className="brand-name">Omie Store</div>
  </div>

  <div className="nav-links">
    <button className={tab === 'checkout' ? 'active' : ''} onClick={() => setTab('checkout')}>🛒 Checkout</button>
    <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>📦 Inventory</button>
    {role === 'manager' && (
      <button className={tab === 'manager' ? 'active' : ''} onClick={() => setTab('manager')}>📊 Manager</button>
    )}
    <button className={tab === 'eod' ? 'active' : ''} onClick={() => setTab('eod')}>🌙 Close shift</button>

  </div>



  <div className="nav-right">
    {/* <div className="status-chip"><span className="status-dot" /> Synced</div> */}

    <div className="status-chip">
  <span className="status-dot" style={{ background: isOnline ? 'var(--mint)' : 'var(--danger)' }} />
  {isOnline
    ? (pendingCount > 0 ? `Syncing ${pendingCount}...` : 'Synced')
    : `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`}
</div>
    <div className="cashier-chip">
  <div className="avatar">{staffName.slice(0, 2).toUpperCase()}</div>
  <span>{staffName} · {role === 'manager' ? 'Manager' : 'Cashier'}</span>
</div>
<button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
  </div>
</div>

      {chosenMood && <div className="mood-banner">{MOOD_BANNER[chosenMood]}</div>}

      {tab === 'inventory' && <Inventory role={role} />}
      {tab === 'manager' && role === 'manager' && <ManagerDashboard />}
      {tab === 'eod' && <EndOfDay role={role} />}

      {tab === 'checkout' && (
        <div className="wrap">
          <div>

            <div className="search-wrap">
  <input
    className="search-input"
    placeholder="🔎 Search for a product..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  {searchResults.length > 0 && (
    <div className="search-results">
      {searchResults.map((p) => (
        <div key={p.product_id} className="search-result-row" onClick={() => { addToCartFromProduct(p); setSearchQuery(''); setSearchResults([]); }}>
        {/* <div key={p.product_id} className="search-result-row" onClick={() => addProductToCart(p)}> */}
          <span>{p.name}</span>
          <span>₦{Number(p.price).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )}
</div>
<button className="scan-btn" onClick={() => setShowScanner(true)}>📷 Scan product</button>
            {/* <button className="scan-btn" onClick={() => setShowScanner(true)}>📷 Scan product</button> */}
            {/* <button className="scan-btn" onClick={() => setShowScanner(true)}>📷 Scan product</button> */}
            {scanError && <p className="error-text">{scanError}</p>}
            <div>
              {cart.length === 0 && <div className="empty-cart">Scan a product to start this sale</div>}
              {cart.map((item) => (
                <div className="cart-row" key={item.product_id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>₦{item.price.toLocaleString()} each</div>
                  </div>
                  <div className="qty-control">
                    <button onClick={() => changeQty(item.product_id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeQty(item.product_id, 1)}>+</button>
                  </div>
                  <div  style={{ fontWeight: 600 }}>₦{(item.price * item.qty).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary">
            <h2 style={{ margin: '0 0 10px' }}>🛍️ Order summary</h2>
            <div className="total-figure">₦{total.toLocaleString()}</div>
            <div className="pay-options">
              {['Cash', 'Card', 'Transfer'].map((method) => (
                <div key={method} className={`pay-pill ${payment === method ? 'selected' : ''}`} onClick={() => setPayment(method)}>{method}</div>
              ))}
            </div>
            <button className="checkout-btn" onClick={completeSale}>Complete sale</button>
          </div>
        </div>
      )}

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {saleDone && receipt && (
  <Receipt
    receipt={receipt}
    onNewSale={() => { setSaleDone(false); setReceipt(null); }}
  />
)}

      {unknownBarcode && (
        <div className="success-overlay">
          <div className="success-card" style={{ textAlign: 'left', width: 300 }}>
            <h3 style={{ marginBottom: 4 }}>New product</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
  Barcode {unknownBarcode} isn't in your inventory yet.{' '}
  {autoFilled ? '✨ We found a matching name below — just confirm the price.' : 'Add it now to sell it.'}
</p>
            <input placeholder="Product name" value={quickName} onChange={(e) => setQuickName(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input placeholder="Price" inputMode="numeric" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input placeholder="Starting stock" inputMode="numeric" value={quickQty} onChange={(e) => setQuickQty(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd' }} />
            <button className="checkout-btn" onClick={handleQuickRegister}>Add &amp; sell this item</button>
            <button onClick={() => setUnknownBarcode(null)} style={{ width: '100%', marginTop: 8, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <Assistant />
    </div>
  );
}

export default App;