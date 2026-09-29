import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const isRunningRef = useRef(false);
  const hasScannedRef = useRef(false);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader', {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
      verbose: false,
    });
    scannerInstanceRef.current = scanner;

    const forceKillCamera = () => {
      // Belt-and-braces: manually stop every video track the browser opened
      document.querySelectorAll('#barcode-reader video').forEach((el) => {
        const video = el as HTMLVideoElement;
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
      });
    };

    const stopCamera = async () => {
      if (isRunningRef.current) {
        isRunningRef.current = false;
        await scanner.stop().catch(() => {});
      }
      forceKillCamera();
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10 },
        async (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          await stopCamera();
          onScan(decodedText);
          onClose();
        },
        () => {}
      )
      .then(() => {
        isRunningRef.current = true;
      })
      .catch((err) => {
        console.error('Camera could not start', err);
      });

    return () => {
      stopCamera();
    };
  }, [onScan, onClose]);

  function handleManualClose() {
    hasScannedRef.current = true;
    onClose();
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div id="barcode-reader" style={{ width: '100%', minHeight: 300 }} />
        <button onClick={handleManualClose} style={closeBtnStyle}>Close scanner</button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};
const cardStyle: React.CSSProperties = {
  background: 'white', padding: 20, borderRadius: 16, width: 340,
};
const closeBtnStyle: React.CSSProperties = {
  marginTop: 12, width: '100%', padding: 12, borderRadius: 10, border: 'none',
  background: '#171623', color: 'white', fontWeight: 600, cursor: 'pointer',
};