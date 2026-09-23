/** El clic del aviso llega un instante después y, si cae en la agenda, cierra la ficha. */
export const PUSH_OPEN = 'marlenne-push-open';

let until = 0;

export function armPushOpen(ms = 800) {
  until = Date.now() + ms;
}

export function signalPushOpen(ms = 800) {
  armPushOpen(ms);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PUSH_OPEN));
}

export function pushOpenArmed() {
  return Date.now() < until;
}
