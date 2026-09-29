const PRODUCTS_KEY = 'omie_cached_products';
const PENDING_SALES_KEY = 'omie_pending_sales';

export function cacheProducts(products: any[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getCachedProducts(): any[] {
  const raw = localStorage.getItem(PRODUCTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function updateCachedProductStock(productId: number, qtySold: number) {
  const products = getCachedProducts();
  const updated = products.map((p) =>
    p.product_id === productId
      ? { ...p, quantity_in_stock: Math.max(0, p.quantity_in_stock - qtySold) }
      : p
  );
  cacheProducts(updated);
}

export type PendingSale = {
  local_id: string;
  staff_id: number;
  total_amount: number;
  payment_type: string;
  items: { product_id: number; quantity: number; price_at_sale: number }[];
  created_at: string;
};

export function getPendingSales(): PendingSale[] {
  const raw = localStorage.getItem(PENDING_SALES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function queueSale(sale: PendingSale) {
  const pending = getPendingSales();
  pending.push(sale);
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
}

export function removePendingSale(localId: string) {
  const pending = getPendingSales().filter((s) => s.local_id !== localId);
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
}