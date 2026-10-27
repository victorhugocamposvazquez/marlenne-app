import { createAdminClient } from '@/lib/supabase/admin';
import { isLabsMobileConfigured, isLabsMobileTestModeForced } from '@/lib/sms/labsmobile';
import { opsAlertEmails, sendMail } from '@/lib/mail';
import { appOriginFromEnv } from '@/lib/app-origin';

export type MonitorFinding = {
  checkKey: string;
  fingerprint: string;
  severity: 'info' | 'warn' | 'error';
  title: string;
  detail: string;
  salonId?: string | null;
};

export type MonitorRunResult = {
  ok: boolean;
  findings: MonitorFinding[];
  emailed: number;
  skippedDedup: number;
  errors: string[];
};

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

/** Comprueba servicios críticos (SMS, crons, Supabase, LabsMobile, app). */
export async function runPlatformMonitor(): Promise<MonitorRunResult> {
  const findings: MonitorFinding[] = [];
  const errors: string[] = [];
  let sb;
  try {
    sb = createAdminClient();
  } catch (e) {
    findings.push({
      checkKey: 'supabase.admin',
      fingerprint: 'supabase.admin.unavailable',
      severity: 'error',
      title: 'Supabase service role no disponible',
      detail: e instanceof Error ? e.message : 'Sin SUPABASE_SERVICE_ROLE_KEY',
    });
    return finalize(findings, errors);
  }

  // 1) Ping BD
  try {
    const { error } = await sb.from('salons').select('id').limit(1);
    if (error) {
      findings.push({
        checkKey: 'supabase.query',
        fingerprint: `supabase.query:${error.code ?? 'err'}`,
        severity: 'error',
        title: 'Supabase no responde a consultas',
        detail: error.message,
      });
    }
  } catch (e) {
    findings.push({
      checkKey: 'supabase.query',
      fingerprint: 'supabase.query.exception',
      severity: 'error',
      title: 'Error al consultar Supabase',
      detail: e instanceof Error ? e.message : 'excepcion',
    });
  }

  // 2) LabsMobile config
  if (!isLabsMobileConfigured()) {
    findings.push({
      checkKey: 'sms.labsmobile.config',
      fingerprint: 'sms.labsmobile.missing',
      severity: 'error',
      title: 'LabsMobile sin credenciales en Vercel',
      detail: 'Faltan LABSMOBILE_USERNAME / LABSMOBILE_API_TOKEN',
    });
  } else if (isLabsMobileTestModeForced()) {
    findings.push({
      checkKey: 'sms.labsmobile.test_mode',
      fingerprint: 'sms.labsmobile.test_forced',
      severity: 'warn',
      title: 'LABSMOBILE_TEST_MODE=1 en el servidor',
      detail: 'Ningún SMS real saldrá hasta quitar esa variable en Vercel',
    });
  }

  // 3) Cron SMS heartbeat (esperado ~1/día)
  {
    const { data: last, error } = await sb
      .from('platform_cron_runs')
      .select('ok, ran_at, summary')
      .eq('job', 'sms')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      errors.push(`cron sms: ${error.message}`);
    } else if (!last) {
      findings.push({
        checkKey: 'cron.sms.missing',
        fingerprint: 'cron.sms.never',
        severity: 'warn',
        title: 'El cron SMS aún no ha corrido',
        detail: 'No hay filas en platform_cron_runs para job=sms',
      });
    } else {
      const ranAt = new Date(last.ran_at as string);
      if (ranAt < hoursAgo(30)) {
        findings.push({
          checkKey: 'cron.sms.stale',
          fingerprint: `cron.sms.stale:${ranAt.toISOString().slice(0, 10)}`,
          severity: 'error',
          title: 'Cron SMS sin ejecutar >30 h',
          detail: `Última ejecución: ${ranAt.toISOString()}`,
        });
      }
      if (last.ok === false) {
        findings.push({
          checkKey: 'cron.sms.failed',
          fingerprint: `cron.sms.failed:${ranAt.toISOString()}`,
          severity: 'error',
          title: 'Último cron SMS falló',
          detail: JSON.stringify(last.summary ?? {}).slice(0, 500),
        });
      }
    }
  }

  // 4) Cron staff-reminders (pg_cron ~1 min)
  {
    const { data: last, error } = await sb
      .from('platform_cron_runs')
      .select('ok, ran_at, summary')
      .eq('job', 'staff-reminders')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && last) {
      const ranAt = new Date(last.ran_at as string);
      if (ranAt < minutesAgo(15)) {
        findings.push({
          checkKey: 'cron.staff.stale',
          fingerprint: `cron.staff.stale:${Math.floor(ranAt.getTime() / 900000)}`,
          severity: 'error',
          title: 'Cron avisos al equipo parado (>15 min)',
          detail: `Última ejecución: ${ranAt.toISOString()}. Revisa pg_cron / CRON_SECRET en Vault.`,
        });
      }
      if (last.ok === false) {
        findings.push({
          checkKey: 'cron.staff.failed',
          fingerprint: `cron.staff.failed:${ranAt.toISOString()}`,
          severity: 'warn',
          title: 'Último cron staff-reminders falló',
          detail: JSON.stringify(last.summary ?? {}).slice(0, 500),
        });
      }
    }
  }

  // 5) Fallos SMS por salón con avisos activos (últimas 24 h)
  {
    const since = hoursAgo(24).toISOString();
    const { data: configs } = await sb
      .from('sms_config')
      .select('salon_id, sender, enabled, test_mode')
      .eq('enabled', true)
      .eq('test_mode', false);

    const live = configs ?? [];
    for (const cfg of live) {
      const salonId = cfg.salon_id as string;
      const { count, error } = await sb
        .from('sms_log')
        .select('id', { count: 'exact', head: true })
        .eq('salon_id', salonId)
        .eq('status', 'failed')
        .gte('created_at', since);
      if (error) {
        errors.push(`sms_log ${salonId}: ${error.message}`);
        continue;
      }
      const n = count ?? 0;
      if (n >= 3) {
        const { data: salon } = await sb.from('salons').select('name').eq('id', salonId).maybeSingle();
        const name = (salon?.name as string) || cfg.sender || salonId.slice(0, 8);
        findings.push({
          checkKey: 'sms.salon.failures',
          fingerprint: `sms.fail:${salonId}:${new Date().toISOString().slice(0, 10)}`,
          severity: 'error',
          title: `${name}: ${n} SMS fallidos en 24 h`,
          detail: `Remitente ${cfg.sender ?? '—'} · revisa LabsMobile / teléfonos / saldo`,
          salonId,
        });
      }
    }

    // Salones live en test_mode con enabled (deberían salir a producción)
    const { data: stuck } = await sb
      .from('sms_config')
      .select('salon_id, sender, test_mode, enabled')
      .eq('enabled', true)
      .neq('test_mode', false)
      .not('sender', 'is', null);

    for (const cfg of stuck ?? []) {
      if (!cfg.sender) continue;
      // Solo avisar de Arlett / senders conocidos en prod si llevan >0 citas due
      const salonId = cfg.salon_id as string;
      const { count } = await sb
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('salon_id', salonId)
        .eq('status', 'prog')
        .is('reminder_sent_at', null)
        .not('reminder_due_at', 'is', null)
        .lte('reminder_due_at', new Date().toISOString());
      if ((count ?? 0) > 0) {
        const { data: salon } = await sb.from('salons').select('name').eq('id', salonId).maybeSingle();
        findings.push({
          checkKey: 'sms.salon.test_mode',
          fingerprint: `sms.test_mode:${salonId}`,
          severity: 'warn',
          title: `${(salon?.name as string) || cfg.sender}: SMS en modo prueba`,
          detail: `Hay ${count} citas con aviso vencido pero test_mode=true. Enciende avisos en Ops.`,
          salonId,
        });
      }
    }
  }

  // 6) App HTTP (origen público)
  {
    const origin = appOriginFromEnv();
    try {
      const res = await fetch(`${origin}/login`, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
      });
      if (res.status >= 500) {
        findings.push({
          checkKey: 'app.http',
          fingerprint: `app.http.${res.status}`,
          severity: 'error',
          title: `App HTTP ${res.status}`,
          detail: `${origin}/login`,
        });
      }
    } catch (e) {
      findings.push({
        checkKey: 'app.http',
        fingerprint: 'app.http.down',
        severity: 'error',
        title: 'App no alcanzable',
        detail: `${origin}: ${e instanceof Error ? e.message : 'timeout/red'}`,
      });
    }
  }

  return finalize(findings, errors, sb);
}

async function finalize(
  findings: MonitorFinding[],
  errors: string[],
  sb?: ReturnType<typeof createAdminClient>,
): Promise<MonitorRunResult> {
  let emailed = 0;
  let skippedDedup = 0;
  const recipients = opsAlertEmails();

  if (!sb) {
    return {
      ok: findings.every(f => f.severity !== 'error'),
      findings,
      emailed: 0,
      skippedDedup: 0,
      errors,
    };
  }

  for (const f of findings) {
    if (f.severity === 'info') continue;

    const { data: existing } = await sb
      .from('platform_monitor_alerts')
      .select('id, emailed_at, resolved_at')
      .eq('fingerprint', f.fingerprint)
      .maybeSingle();

    if (existing && !existing.resolved_at && existing.emailed_at) {
      skippedDedup += 1;
      continue;
    }

    if (!recipients.length) {
      errors.push('Sin OPS_ALERT_EMAIL: hallazgo no enviado por correo');
      await sb.from('platform_monitor_alerts').upsert(
        {
          fingerprint: f.fingerprint,
          check_key: f.checkKey,
          salon_id: f.salonId ?? null,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
          emailed_at: null,
          resolved_at: null,
        },
        { onConflict: 'fingerprint' },
      );
      continue;
    }

    const mailed = await sendMail({
      to: recipients,
      subject: `[Marlén Ops] ${f.title}`,
      text: [
        f.title,
        '',
        f.detail,
        '',
        `Check: ${f.checkKey}`,
        f.salonId ? `Salon: ${f.salonId}` : '',
        `Severidad: ${f.severity}`,
        `Cuando: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n'),
    });

    if (!mailed.ok) {
      errors.push(`email ${f.checkKey}: ${mailed.error}`);
      continue;
    }

    emailed += 1;
    await sb.from('platform_monitor_alerts').upsert(
      {
        fingerprint: f.fingerprint,
        check_key: f.checkKey,
        salon_id: f.salonId ?? null,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
        emailed_at: new Date().toISOString(),
        resolved_at: null,
      },
      { onConflict: 'fingerprint' },
    );
  }

  // Resolver alertas abiertas cuyo fingerprint ya no aparece
  const openFingerprints = new Set(findings.map(f => f.fingerprint));
  const { data: openRows } = await sb
    .from('platform_monitor_alerts')
    .select('id, fingerprint')
    .is('resolved_at', null)
    .limit(200);
  for (const row of openRows ?? []) {
    if (!openFingerprints.has(row.fingerprint as string)) {
      await sb
        .from('platform_monitor_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  await sb.from('platform_cron_runs').insert({
    job: 'health',
    ok: findings.every(f => f.severity !== 'error') && errors.length === 0,
    summary: {
      findings: findings.length,
      emailed,
      skippedDedup,
      errors,
      keys: findings.map(f => f.checkKey),
    },
  });

  return {
    ok: findings.every(f => f.severity !== 'error'),
    findings,
    emailed,
    skippedDedup,
    errors,
  };
}
