export type ReceiptData = {
  saleId: number;
  items: { name: string; qty: number; price: number }[];
  total: number;
  payment: string;
  cashier: string;
  date: string;
  pending?: boolean;
};

type Props = {
  receipt: ReceiptData;
  onNewSale: () => void;
};

const PAY_ICON: Record<string, string> = { Cash: '💵', Card: '💳', Transfer: '🔁' };

export default function Receipt({ receipt, onNewSale }: Props) {
  const when = new Date(receipt.date);

  function shareOnWhatsApp() {
    const lines = [
      'OMIE STORE',
      'Thank you for your purchase!',
      '--------------------------',
      `Order No: ${receipt.saleId}`,
      `Date: ${when.toLocaleDateString()} ${when.toLocaleTimeString()}`,
      '--------------------------',
      ...receipt.items.map(
        (i) => `${i.name}  x${i.qty}  ₦${(i.price * i.qty).toLocaleString()}`
      ),
      '--------------------------',
      `Total: ₦${receipt.total.toLocaleString()}`,
      `Payment: ${receipt.payment}`,
      `Served by: ${receipt.cashier}`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  return (
    <div className="success-overlay">
      <div className="success-card receipt-card">
        <div className="receipt-done">✅ Sale complete</div>

        <div className="receipt-print">
          <div className="receipt-title">Sales Receipt</div>
          <div className="receipt-tagline">Thank you for your purchase!</div>

          <div className="receipt-meta">
            {/* <span>Order No. {receipt.saleId}</span> */}

            <span>{receipt.pending ? '⏳ Pending sync' : `Order No. ${receipt.saleId}`}</span>
            <span>{when.toLocaleDateString()}</span>
          </div>

          <div className="receipt-dash" />

          <div className="receipt-cols receipt-head">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
          </div>

          {receipt.items.map((item, index) => (
            <div className="receipt-cols" key={index}>
              <span>{item.name}</span>
              <span>{item.qty}</span>
              <span>₦{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}

          <div className="receipt-dash" />

          <div className="receipt-total-row">
            <span>Total</span>
            <span>₦{receipt.total.toLocaleString()}</span>
          </div>

          <div className="receipt-pay-row">
            {PAY_ICON[receipt.payment] || ''} Paid by {receipt.payment}
          </div>
          <div className="receipt-pay-row">Served by {receipt.cashier}</div>
        </div>

        <div className="receipt-actions">
          <button className="receipt-btn" onClick={() => window.print()}>🖨️ Print</button>
          <button className="receipt-btn" onClick={shareOnWhatsApp}>💬 WhatsApp</button>
        </div>
        <button className="checkout-btn" onClick={onNewSale}>Start new sale</button>
      </div>
    </div>
  );
}