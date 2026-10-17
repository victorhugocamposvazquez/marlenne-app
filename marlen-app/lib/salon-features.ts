export type SalonAgendaFeatures = {
  /** Cobro en ficha + caja real en Hoy. */
  apptPayment: boolean;
  /** Bloque «Citas sin llegar» en Hoy. */
  overdueAppts: boolean;
};

export const DEFAULT_SALON_AGENDA_FEATURES: SalonAgendaFeatures = {
  apptPayment: true,
  overdueAppts: true,
};

export function salonAgendaFeaturesFromRow(row: {
  feature_appt_payment?: boolean | null;
  feature_overdue_appts?: boolean | null;
} | null | undefined): SalonAgendaFeatures {
  if (!row) return { ...DEFAULT_SALON_AGENDA_FEATURES };
  return {
    apptPayment: row.feature_appt_payment !== false,
    overdueAppts: row.feature_overdue_appts !== false,
  };
}

/** Facturas Amazon/Meta en Finanzas. Solo si Ops lo activa (default off). */
export function vendorInvoicesEnabledFromRow(row: {
  feature_vendor_invoices?: boolean | null;
} | null | undefined): boolean {
  return row?.feature_vendor_invoices === true;
}
