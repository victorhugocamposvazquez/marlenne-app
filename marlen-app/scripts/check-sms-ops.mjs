#!/usr/bin/env node
/**
 * Checklist operativo SMS + monitor (solo lectura de estado).
 * Uso: node scripts/check-sms-ops.mjs   (desde marlen-app/, con .env.local)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}

const root = resolve(import.meta.dirname, '..');
const env = {
  ...loadEnv(resolve(root, '.env.local')),
  ...process.env,
};

const checks = [];
function row(ok, label, detail) {
  checks.push({ ok, label, detail });
  console.log(`${ok ? 'OK ' : 'NO '} ${label}${detail ? ` — ${detail}` : ''}`);
}

row(Boolean(env.CRON_SECRET), 'CRON_SECRET', env.CRON_SECRET ? 'definido' : 'falta en entorno');
row(Boolean(env.LABSMOBILE_USERNAME && env.LABSMOBILE_API_TOKEN), 'LabsMobile credenciales',
  env.LABSMOBILE_USERNAME ? 'username+token' : 'faltan LABSMOBILE_USERNAME/API_TOKEN');
row(env.LABSMOBILE_TEST_MODE !== '1', 'LABSMOBILE_TEST_MODE apagado',
  env.LABSMOBILE_TEST_MODE === '1' ? 'QUITAR en Vercel Production' : 'ok');
row(Boolean(env.RESEND_API_KEY), 'RESEND_API_KEY (monitor)', env.RESEND_API_KEY ? 'definido' : 'falta para alertas');
row(Boolean(env.OPS_ALERT_EMAIL || env.MAIL_OPS), 'OPS_ALERT_EMAIL',
  (env.OPS_ALERT_EMAIL || env.MAIL_OPS || 'falta'));

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  row(false, 'Supabase service role', 'falta en .env.local');
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ARLETT = '6bbead25-1a38-4d4e-bb6b-4c290a08d74f';
const { data: cfg } = await sb.from('sms_config').select('*').eq('salon_id', ARLETT).maybeSingle();
if (!cfg) {
  row(false, 'sms_config Arlett', 'no hay fila');
} else {
  row(cfg.enabled === true, 'Arlett enabled', String(cfg.enabled));
  row(cfg.test_mode === false, 'Arlett test_mode=false (avisos reales)', `test_mode=${cfg.test_mode}`);
  row(Boolean(cfg.sender), 'Arlett sender', cfg.sender || 'vacío — pon número en Ajustes→SMS');
  const phoneLike = /^\d{9,16}$/.test(String(cfg.sender || ''));
  row(phoneLike || Boolean(cfg.sender), 'Sender listo para LabsMobile',
    phoneLike ? 'número' : `actual: ${cfg.sender} (cambia a número si la ley lo exige)`);
}

const { data: tmpl } = await sb.from('sms_templates').select('activa').eq('salon_id', ARLETT).eq('clave', 'recordatorio_cita').maybeSingle();
row(tmpl?.activa === true, 'Plantilla recordatorio_cita', tmpl ? `activa=${tmpl.activa}` : 'falta');

const { error: monErr } = await sb.from('platform_monitor_alerts').select('id').limit(1);
row(!monErr, 'Tabla platform_monitor_alerts', monErr ? monErr.message : 'ok');

const { data: last } = await sb.from('platform_cron_runs').select('ok,ran_at').eq('job', 'sms').order('ran_at', { ascending: false }).limit(1);
row(Boolean(last?.[0]), 'Cron SMS ha corrido', last?.[0] ? `${last[0].ran_at} ok=${last[0].ok}` : 'nunca');

const failed = checks.filter(c => !c.ok).length;
console.log(failed ? `\n${failed} pendiente(s)` : '\nTodo listo a nivel checklist');
process.exit(failed ? 1 : 0);
