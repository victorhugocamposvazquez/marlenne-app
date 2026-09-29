/** Contenedor del panel derecho en WideShell. SheetShell / TaskSheetHost hacen portal aquí. */
export const APP_DETAIL_SLOT_ID = 'app-detail-slot';

export function getDetailSlot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(APP_DETAIL_SLOT_ID);
}
