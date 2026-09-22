'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { MODAL_BONUSES, MODAL_PLANS, MODAL_ROLES, type ModalData, type ModalKind } from '@/lib/panel-modals';

type FormState = {
  name: string;
  contact: string;
  city: string;
  email: string;
  phone: string;
  plan: string;
  trial: boolean;
  sms: string;
  price: string;
  prosLabel: string;
  bonus: string;
  charge: string;
  role: string;
  cat: string;
  kindx: string;
};

function defaultForm(kind: ModalKind, data: ModalData): FormState {
  if (kind === 'plan') {
    return {
      name: data.name ?? '',
      contact: '',
      city: '',
      email: '',
      phone: '',
      plan: 'Pro',
      trial: true,
      sms: String(data.sms ?? ''),
      price: String(data.price ?? ''),
      prosLabel: data.pros ? String(data.pros) : '0',
      bonus: 'Bono 500 SMS',
      charge: 'Cobrar ahora',
      role: 'Soporte',
      cat: 'Software',
      kindx: 'Fijo mensual',
    };
  }
  if (kind === 'changePlan') {
    return {
      name: '',
      contact: '',
      city: '',
      email: '',
      phone: '',
      plan: data.plan ?? 'Pro',
      trial: true,
      sms: '',
      price: '',
      prosLabel: '0',
      bonus: 'Bono 500 SMS',
      charge: 'Cobrar ahora',
      role: 'Soporte',
      cat: 'Software',
      kindx: 'Fijo mensual',
    };
  }
  if (kind === 'bonusFor') {
    return {
      name: '',
      contact: '',
      city: '',
      email: '',
      phone: '',
      plan: 'Pro',
      trial: true,
      sms: '',
      price: '',
      prosLabel: '0',
      bonus: 'Bono 500 SMS',
      charge: 'Cobrar ahora',
      role: 'Soporte',
      cat: 'Software',
      kindx: 'Fijo mensual',
    };
  }
  if (kind === 'invite') {
    return {
      name: '',
      contact: '',
      city: '',
      email: '',
      phone: '',
      plan: 'Pro',
      trial: true,
      sms: '',
      price: '',
      prosLabel: '0',
      bonus: 'Bono 500 SMS',
      charge: 'Cobrar ahora',
      role: 'Soporte',
      cat: 'Software',
      kindx: 'Fijo mensual',
    };
  }
  return {
    name: '',
    contact: '',
    city: '',
    email: '',
    phone: '',
    plan: 'Pro',
    trial: true,
    sms: '',
    price: '',
    prosLabel: '0',
    bonus: 'Bono 500 SMS',
    charge: 'Cobrar ahora',
    role: 'Soporte',
    cat: 'Software',
    kindx: 'Fijo mensual',
  };
}

function sel(on: boolean) {
  return on ? 'border-[1.5px] border-ink bg-white' : 'border-[1.5px] border-line bg-page';
}

function chip(on: boolean) {
  return on ? 'border-[1.5px] border-ink bg-ink text-white' : 'border-[1.5px] border-line bg-white text-ink';
}

export default function PanelModal({
  kind,
  data,
  onClose,
  onToast,
}: {
  kind: ModalKind;
  data: ModalData;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [f, setF] = useState(() => defaultForm(kind, data));

  useEffect(() => {
    setStep(1);
    setF(defaultForm(kind, data));
  }, [kind, data]);

  const patch = (p: Partial<FormState>) => setF(prev => ({ ...prev, ...p }));

  const planObj = MODAL_PLANS.find(p => p.name === f.plan) ?? MODAL_PLANS[1];
  const bonusObj = MODAL_BONUSES.find(b => b.name === f.bonus) ?? MODAL_BONUSES[1];
  const c1ok = f.name.trim().length > 1 && f.email.includes('@');

  let kicker = '';
  let title = '';
  let primaryLabel = 'Cerrar';
  let ready = true;
  let canBack = false;
  let hasSteps = false;

  const isCompany = kind === 'company';
  if (isCompany) {
    hasSteps = true;
    kicker = `Alta de empresa · paso ${step} de 3`;
    title = step === 1 ? '¿Qué centro damos de alta?' : step === 2 ? '¿Con qué plan empieza?' : '¿Todo correcto?';
    ready = step === 1 ? c1ok : true;
    primaryLabel = step === 1
      ? (ready ? 'Siguiente' : !f.name.trim() ? 'Escribe el nombre' : 'Falta un correo válido')
      : step === 2 ? 'Siguiente' : 'Crear empresa y enviar invitación';
    canBack = step > 1;
  } else if (kind === 'plan') {
    kicker = 'Editar plan';
    title = data.name ?? 'Plan';
    primaryLabel = 'Guardar cambios';
  } else if (kind === 'bonus') {
    kicker = 'Planes y bonos';
    title = 'Nuevo bono de SMS';
    ready = Number(f.sms) > 0 && Number(f.price) > 0;
    primaryLabel = ready ? 'Crear bono' : 'Indica cantidad y precio';
  } else if (kind === 'bonusFor') {
    kicker = data.company ?? 'Empresa';
    title = 'Añadir bono de SMS';
    primaryLabel = `Añadir ${bonusObj.name} · ${bonusObj.price} €`;
  } else if (kind === 'changePlan') {
    kicker = data.company ?? 'Empresa';
    title = 'Cambiar de plan';
    ready = f.plan !== (data.plan ?? '');
    primaryLabel = ready ? `Cambiar a ${f.plan}` : 'Elige otro plan';
  } else if (kind === 'expense') {
    kicker = 'Finanzas';
    title = 'Añadir gasto';
    ready = !!f.name.trim() && Number(f.price) > 0;
    primaryLabel = ready ? 'Guardar gasto' : 'Nombre e importe';
  } else if (kind === 'referral') {
    kicker = 'Programa de referidos';
    title = 'Reglas del programa';
    primaryLabel = 'Guardar reglas';
  } else if (kind === 'invite') {
    kicker = 'Equipo';
    title = 'Invitar a una persona';
    ready = f.email.includes('@');
    primaryLabel = ready ? `Enviar invitación como ${f.role}` : 'Escribe un correo';
  }

  const dir = kind === 'changePlan'
    ? MODAL_PLANS.findIndex(p => p.name === f.plan) - MODAL_PLANS.findIndex(p => p.name === (data.plan ?? 'Pro'))
    : 0;

  const handlePrimary = () => {
    if (!ready) return;
    if (isCompany) {
      if (step < 3) { setStep(step + 1); return; }
      onClose();
      onToast(`${f.name.trim()} creada · invitación enviada a ${f.email}`);
      router.push('/empresas');
      return;
    }
    if (kind === 'plan') { onClose(); onToast(`Plan ${f.name} guardado`); return; }
    if (kind === 'bonus') { onClose(); onToast(`Bono ${f.sms} SMS · ${f.price} € creado`); return; }
    if (kind === 'bonusFor') {
      onClose();
      onToast(`${bonusObj.name} añadido a ${data.company}${f.charge === 'Cobrar ahora' ? ' · cobrado por Stripe' : ' · en la próxima factura'}`);
      return;
    }
    if (kind === 'changePlan') { onClose(); onToast(`${data.company} pasa a ${f.plan}`); return; }
    if (kind === 'expense') { onClose(); onToast(`Gasto «${f.name}» · ${f.price} €/mes añadido`); return; }
    if (kind === 'referral') { onClose(); onToast('Reglas de referidos guardadas · aplican a nuevos códigos'); return; }
    if (kind === 'invite') { onClose(); onToast(`Invitación enviada a ${f.email}`); return; }
    onClose();
  };

  const sms = Number(f.sms) || 0;
  const price = Number(f.price) || 0;

  return (
    <>
      <button type="button" aria-label="Cerrar modal" onClick={onClose} className="fixed inset-0 z-[20] bg-[rgba(15,14,26,.4)]" />
      <div className="fixed left-1/2 top-1/2 z-[21] flex max-h-[calc(100vh-48px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,14,26,.3)]">
        <header className="flex shrink-0 items-center gap-3 px-[26px] pb-0 pt-[22px]">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-2">{kicker}</p>
            <p className="text-[22px] font-bold tracking-[-0.03em]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-pill bg-[#F2F2F7]">
            <X size={16} />
          </button>
        </header>

        {hasSteps && (
          <div className="mx-[26px] mt-4 flex gap-1.5">
            {[1, 2, 3].map(s => (
              <span key={s} className={`h-1 flex-1 rounded-pill ${step >= s ? 'bg-grad' : 'bg-line'}`} />
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[26px] py-[22px] pb-2">
          {isCompany && step === 1 && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Nombre del centro</span>
                <input value={f.name} onChange={e => patch({ name: e.target.value })} placeholder="p. ej. Centro Aura" className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Persona de contacto', 'contact', 'Nombre y apellido'],
                  ['Ciudad', 'city', 'Madrid'],
                  ['Correo', 'email', 'hola@centro.es'],
                  ['Móvil', 'phone', '600 00 00 00'],
                ].map(([label, key, ph]) => (
                  <label key={key} className="flex min-w-0 flex-col gap-2">
                    <span className="text-[13px] font-semibold text-ink-2">{label}</span>
                    <input
                      value={f[key as keyof FormState] as string}
                      onChange={e => patch({ [key]: e.target.value } as Partial<FormState>)}
                      placeholder={ph}
                      className="h-[52px] rounded-field bg-page px-4 text-[15px] outline-none"
                    />
                  </label>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-ink-3">Al correo llegará la invitación para crear su contraseña. El móvil se usa como remitente de prueba de SMS.</p>
            </>
          )}

          {isCompany && step === 2 && (
            <>
              <div className="flex flex-col gap-2.5">
                {MODAL_PLANS.map(p => (
                  <button key={p.name} type="button" onClick={() => patch({ plan: p.name })} className={`flex w-full items-center gap-3.5 rounded-field p-4 text-left ${sel(f.plan === p.name)}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold">{p.name}</p>
                      <p className="text-[13px] text-ink-2">{p.desc}</p>
                    </div>
                    <span className="text-[16px] font-bold">{p.price} €/mes</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => patch({ trial: !f.trial })} className="flex w-full items-center gap-3.5 rounded-field border-none bg-page p-4 text-left">
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">Empezar con 14 días de prueba</p>
                  <p className="text-[13px] text-ink-2">Sin tarjeta · 50 SMS · después pasa al plan elegido</p>
                </div>
                <span className={`relative h-7 w-[46px] shrink-0 rounded-pill ${f.trial ? 'bg-ink' : 'bg-[#D9D8E0]'}`}>
                  <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-pill bg-white shadow transition-all ${f.trial ? 'left-[21px]' : 'left-[3px]'}`} />
                </span>
              </button>
            </>
          )}

          {isCompany && step === 3 && (
            <>
              <div className="flex flex-col rounded-card bg-page px-[18px] py-1">
                {[
                  ['Centro', f.name],
                  ['Contacto', `${f.contact || '—'} · ${f.email}`],
                  ['Ciudad', f.city || '—'],
                  ['Plan', `${planObj.name} · ${planObj.price} €/mes${f.trial ? ' · tras 14 días de prueba' : ''}`],
                ].map(([label, value], i) => (
                  <div key={label} className={`flex items-center gap-3 py-3.5 ${i ? 'border-t border-[#E6E5EC]' : ''}`}>
                    <span className="w-[110px] shrink-0 text-[13px] text-ink-3">{label}</span>
                    <span className="flex-1 text-[15px] font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[14px] leading-relaxed text-ink-2">
                {f.trial
                  ? 'Se crea la cuenta sin cobro. Le avisamos 3 días antes de terminar la prueba para que añada tarjeta.'
                  : 'Se crea la cuenta y Stripe le pide la tarjeta en el primer acceso.'}
              </p>
            </>
          )}

          {kind === 'plan' && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Nombre</span>
                <input value={f.name} onChange={e => patch({ name: e.target.value })} className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Precio al mes</span>
                  <div className="flex h-[52px] items-center gap-1 rounded-field bg-page px-4">
                    <input value={f.price} onChange={e => patch({ price: e.target.value.replace(/\D/g, '') })} inputMode="numeric" className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold outline-none" />
                    <span className="text-[16px] font-semibold text-ink-3">€</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">SMS incluidos / mes</span>
                  <input value={f.sms} onChange={e => patch({ sms: e.target.value.replace(/\D/g, '') })} inputMode="numeric" className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Profesionales</span>
                  <input value={f.prosLabel === '0' ? '' : f.prosLabel} onChange={e => patch({ prosLabel: e.target.value.replace(/\D/g, '') || '0' })} placeholder="0 = ilimitados" className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
                </label>
              </div>
              <div className="rounded-[14px] bg-[#FFF7E6] px-3.5 py-3 text-[13px] leading-relaxed text-[#8A5A00]">
                Afecta a las empresas que ya están en {data.name}: el nuevo precio se aplica en su siguiente renovación y se les avisa por correo con 30 días.
              </div>
            </>
          )}

          {kind === 'bonus' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Cantidad de SMS</span>
                  <input autoFocus value={f.sms} onChange={e => patch({ sms: e.target.value.replace(/\D/g, '') })} placeholder="500" className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Precio</span>
                  <div className="flex h-[52px] items-center gap-1 rounded-field bg-page px-4">
                    <input value={f.price} onChange={e => patch({ price: e.target.value.replace(/\D/g, '') })} placeholder="25" className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold outline-none" />
                    <span className="text-[16px] font-semibold text-ink-3">€</span>
                  </div>
                </label>
              </div>
              <p className="text-[14px] text-ink-2">
                {sms && price ? `${(price / sms).toFixed(3).replace('.', ',')} €/SMS · nuestro coste es 0,033 €/SMS` : 'Escribe cantidad y precio para ver el precio por SMS.'}
              </p>
            </>
          )}

          {kind === 'bonusFor' && (
            <>
              <div className="flex flex-col gap-2.5">
                {MODAL_BONUSES.map(b => (
                  <button key={b.name} type="button" onClick={() => patch({ bonus: b.name })} className={`flex w-full items-center gap-3.5 rounded-field p-4 text-left ${sel(f.bonus === b.name)}`}>
                    <span className="flex-1 text-[16px] font-semibold">{b.name}</span>
                    <span className="text-[13px] text-ink-2">{(b.price / b.sms).toFixed(2).replace('.', ',')} €/SMS</span>
                    <span className="text-[16px] font-bold">{b.price} €</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold text-ink-2">Cómo se cobra</span>
                <div className="flex flex-wrap gap-2">
                  {['Cobrar ahora', 'Sumar a la próxima factura', 'Regalo (sin cobro)'].map(o => (
                    <button key={o} type="button" onClick={() => patch({ charge: o })} className={`h-10 rounded-pill px-3.5 text-[13px] font-semibold ${chip(f.charge === o)}`}>{o}</button>
                  ))}
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-3">Los envíos se reanudan en el momento en que se añade el bono.</p>
            </>
          )}

          {kind === 'changePlan' && (
            <>
              <div className="flex flex-col gap-2.5">
                {MODAL_PLANS.map(p => (
                  <button key={p.name} type="button" onClick={() => patch({ plan: p.name })} className={`flex w-full items-center gap-3.5 rounded-field p-4 text-left ${sel(f.plan === p.name)}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold">{p.name}</p>
                      <p className="text-[13px] text-ink-2">{p.desc}</p>
                    </div>
                    <span className="text-[16px] font-bold">{p.price} €/mes</span>
                  </button>
                ))}
              </div>
              <div className="rounded-[14px] bg-page px-3.5 py-3 text-[14px] leading-relaxed">
                {!ready ? `Ahora mismo está en ${data.plan}.` : dir > 0 ? `Sube de ${data.plan} a ${f.plan}: se aplica hoy y Stripe cobra la diferencia prorrateada.` : `Baja de ${data.plan} a ${f.plan}: se aplica al terminar el ciclo actual; hasta entonces mantiene lo que tiene.`}
              </div>
            </>
          )}

          {kind === 'expense' && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Concepto</span>
                <input value={f.name} onChange={e => patch({ name: e.target.value })} placeholder="p. ej. Vercel Pro" className="h-[52px] rounded-field bg-page px-4 text-[16px] font-semibold outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Importe al mes</span>
                  <div className="flex h-[52px] items-center gap-1 rounded-field bg-page px-4">
                    <input value={f.price} onChange={e => patch({ price: e.target.value.replace(/\D/g, '') })} placeholder="0" className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold outline-none" />
                    <span className="text-[16px] font-semibold text-ink-3">€</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-2">Proveedor</span>
                  <input value={f.contact} onChange={e => patch({ contact: e.target.value })} placeholder="p. ej. Vercel Inc." className="h-[52px] rounded-field bg-page px-4 text-[15px] outline-none" />
                </label>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold text-ink-2">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {['Infraestructura', 'Mensajería', 'Pagos', 'Software', 'Marketing', 'Otros'].map(o => (
                    <button key={o} type="button" onClick={() => patch({ cat: o })} className={`h-[38px] rounded-pill px-3.5 text-[13px] font-semibold ${chip(f.cat === o)}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold text-ink-2">Tipo</span>
                <div className="flex flex-wrap gap-2">
                  {['Fijo mensual', 'Variable por uso', 'Anual (prorrateado)'].map(o => (
                    <button key={o} type="button" onClick={() => patch({ kindx: o })} className={`h-[38px] rounded-pill px-3.5 text-[13px] font-semibold ${chip(f.kindx === o)}`}>{o}</button>
                  ))}
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-3">Los variables (SMS, Stripe) se calculan solos desde el uso real; aquí solo se registran los fijos y los anuales.</p>
            </>
          )}

          {kind === 'referral' && (
            <>
              <div className="flex flex-col rounded-card bg-page px-[18px] py-1">
                {[
                  ['Descuento a la referida', '20 % durante 3 meses'],
                  ['Premio a la referente', '200 SMS + 10 € en la siguiente factura'],
                  ['Cuándo se paga el premio', 'Al primer cobro correcto de la referida'],
                  ['Máximo de premios por empresa', '10 al año'],
                  ['Formato del código', 'NOMBRE-XXX · enlace marlen.app/r/CÓDIGO'],
                ].map(([k, v], i) => (
                  <div key={k} className={`flex items-center gap-3 py-3.5 ${i ? 'border-t border-[#E6E5EC]' : ''}`}>
                    <span className="min-w-0 flex-[1_1_140px] text-[13px] text-ink-3">{k}</span>
                    <input defaultValue={v} className="h-10 min-w-0 flex-[1_1_180px] rounded-xl border-none bg-white px-3 text-[14px] font-semibold outline-none" />
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-ink-3">Los cambios no afectan a los descuentos ya concedidos.</p>
            </>
          )}

          {kind === 'invite' && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Correo</span>
                <input autoFocus value={f.email} onChange={e => patch({ email: e.target.value })} placeholder="nombre@marlen.app" className="h-[52px] rounded-field bg-page px-4 text-[16px] outline-none" />
              </label>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold text-ink-2">Rol</span>
                {MODAL_ROLES.map(r => (
                  <button key={r.name} type="button" onClick={() => patch({ role: r.name })} className={`flex w-full items-center gap-3.5 rounded-field p-4 text-left ${sel(f.role === r.name)}`}>
                    <span className="w-[90px] shrink-0 text-[15px] font-semibold">{r.name}</span>
                    <span className="flex-1 text-[13px] leading-snug text-ink-2">{r.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="flex shrink-0 gap-2.5 px-[26px] pb-6 pt-4">
          {canBack && (
            <button type="button" onClick={() => setStep(step - 1)} className="h-[52px] rounded-pill bg-[#F2F2F7] px-5 text-[15px] font-semibold">
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={handlePrimary}
            className={`h-[52px] flex-1 rounded-pill text-[15px] font-bold ${ready ? 'bg-grad text-white' : 'bg-line text-ink-3'}`}
          >
            {primaryLabel}
          </button>
        </footer>
      </div>
    </>
  );
}
