/** En iOS, con varios campos en la página sale la barra anterior/siguiente del teclado. */
const CHROME_SELECTORS = '.voice-fab-host, .app-bottom-nav';

export function setSearchFocusIsolate(active: boolean) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(CHROME_SELECTORS).forEach(el => {
    if (active) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  });
}