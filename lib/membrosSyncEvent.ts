/** Evento global disparado após "Sincronizar usuários" para que os formulários recarreguem a lista de membros sem precisar de F5. */
export const MEMBROS_SINCRONIZADOS_EVENT = "membros-sincronizados";

export function notificarMembrosSincronizados() {
  window.dispatchEvent(new Event(MEMBROS_SINCRONIZADOS_EVENT));
}
