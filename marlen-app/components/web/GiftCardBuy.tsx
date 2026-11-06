'use client';

import React, { useState } from 'react';

type Props = {
  slug: string;
  amountsEur: number[];
  accent: string;
  onAccent: string;
  ink: string;
  muted: string;
  line: string;
  bg: string;
  radius: string | number;
  btnHeight: number;
  btnPx: number;
  btnFs: number;
};

export default function GiftCardBuy({
  slug,
  amountsEur,
  accent,
  onAccent,
  ink,
  muted,
  line,
  bg,
  radius,
  btnHeight,
  btnPx,
  btnFs,
}: Props) {
  const amounts = amountsEur.length ? amountsEur : [30, 50, 100];
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(amounts.includes(50) ? 50 : amounts[0]!);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCss: React.CSSProperties = {
    height: 44,
    borderRadius: 10,
    border: `1px solid ${line}`,
    padding: '0 12px',
    fontSize: 15,
    fontFamily: 'inherit',
    color: ink,
    background: bg,
    width: '100%',
    boxSizing: 'border-box',
  };

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gift/${encodeURIComponent(slug)}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountEur: amount,
          buyerName,
          buyerEmail,
          buyerPhone: buyerPhone || undefined,
          recipientName: recipientName || undefined,
          message: message || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        setError(json.error || 'No se pudo iniciar el pago');
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError('Error de red');
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          height: btnHeight,
          padding: `0 ${btnPx}px`,
          borderRadius: radius,
          background: accent,
          color: onAccent,
          fontSize: btnFs,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          alignSelf: 'flex-start',
        }}
      >
        Comprar tarjeta regalo
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Comprar tarjeta regalo"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15,14,26,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: '90dvh',
              overflow: 'auto',
              background: bg,
              color: ink,
              borderRadius: 20,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <strong style={{ fontSize: 18 }}>Tarjeta regalo</strong>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: muted, lineHeight: 1 }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {amounts.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  style={{
                    height: 44,
                    minWidth: 72,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${amount === a ? ink : line}`,
                    background: amount === a ? ink : bg,
                    color: amount === a ? bg : ink,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {a} €
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: muted }}>
              Tu nombre
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} style={inputCss} autoComplete="name" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: muted }}>
              Tu email
              <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} style={inputCss} type="email" autoComplete="email" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: muted }}>
              Teléfono (opcional)
              <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} style={inputCss} type="tel" autoComplete="tel" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: muted }}>
              Para quién (opcional)
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} style={inputCss} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: muted }}>
              Mensaje (opcional)
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                style={{ ...inputCss, height: 'auto', padding: 12, resize: 'vertical' }}
              />
            </label>

            {error && <p style={{ margin: 0, fontSize: 13, color: '#B42318', fontWeight: 600 }}>{error}</p>}

            <button
              type="button"
              disabled={busy}
              onClick={() => void pay()}
              style={{
                height: btnHeight,
                borderRadius: radius,
                background: accent,
                color: onAccent,
                fontSize: btnFs,
                fontWeight: 600,
                border: 'none',
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Redirigiendo…' : `Pagar ${amount} €`}
            </button>
            <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.4 }}>
              Pago seguro con Stripe. Recibirás el código por email y lo canjeas en el centro.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
