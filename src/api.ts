// const BASE_URL = 'http://127.0.0.1:8000/api';

// const BASE_URL = 'https://pos-system-xxxx.onrender.com/api';

const BASE_URL = 'https://pos-system-d2d0.onrender.com/api';
function getToken() {
  return localStorage.getItem('pos_token');
}

// async function request(path: string, options: RequestInit = {}) {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       Accept: 'application/json',
//       ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
//       ...(options.headers || {}),
//     },
//   });

//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));
//     const error: any = new Error(body.message || `Request failed (${res.status})`);
//     error.status = res.status; // NEW: so callers can tell 404 apart from other errors
//     throw error;
//   }

//   return res.json();
// }

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(path !== '/login' && getToken()
        ? { Authorization: `Bearer ${getToken()}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error: any = new Error(
      body.message || `Request failed (${res.status})`
    );
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export function login(email: string, password: string) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ login_info: email, password }),
  });
}

export function getProductByBarcode(barcode: string) {
  return request(`/products/barcode/${barcode}`);
}

export function createSale(payload: {
  staff_id: number;
  total_amount: number;
  payment_type: string;
  items: { product_id: number; quantity: number; price_at_sale: number }[];
}) {
  return request('/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveToken(token: string) {
  localStorage.setItem('pos_token', token);
}

export function getAllProducts() {
  return request('/products');
}

export function addProduct(payload: {
  name: string;
  price: number;
  barcode: string;
  quantity_in_stock: number;
  expiry_date: string;
  supplier_id: number;
}) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSalesByDate(date: string) {
  return request(`/sales/by-date?date=${date}`);
}

export function voidSale(saleId: number) {
  return request(`/sales/${saleId}`, { method: 'DELETE' });
}

// export function deleteProduct(productId: number) {
//   return request(`/products/${productId}`, { method: 'DELETE' });
// }

export function getStaffList() {
  return request('/staff');
}

export function createStaff(payload: { name: string; login_info: string; role: string; password: string }) {
  return request('/staff', { method: 'POST', body: JSON.stringify(payload) });
}

export function lookupExternalProduct(barcode: string) {
  return request(`/products/lookup-external/${barcode}`);
}

export function clearToken() {
  localStorage.removeItem('pos_token');
}
export function getEodSummary(date: string) {
  return request(`/eod/summary?date=${date}`);
}
export function submitEod(payload: { date: string; satisfied_customers: number; notes: string }) {
  return request('/eod', { method: 'POST', body: JSON.stringify(payload) });
}
export function getEodReports(date: string) {
  return request(`/eod?date=${date}`);
}

export function searchProducts(query: string) {
  return request(`/products?search=${encodeURIComponent(query)}`);
}

export function askAssistant(message: string) {
  return request('/assistant', { method: 'POST', body: JSON.stringify({ message }) });
}

export function requestDeleteOtp(productId: number) {
  return request(`/products/${productId}/request-delete-otp`, { method: 'POST' });
}
export function deleteProduct(productId: number, otp: string) {
  return request(`/products/${productId}`, { method: 'DELETE', body: JSON.stringify({ otp }) });
}