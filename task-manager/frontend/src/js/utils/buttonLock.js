/**
 * buttonLock.js
 * Impede cliques duplicados em botões: o primeiro clique passa normalmente,
 * os seguintes são bloqueados por 3 segundos.
 */

const LOCK_DURATION = 3000; // ms
const LOCKED_CLASS = 'btn-locked';

/**
 * Listener global — roda em fase de CAPTURA.
 * Se o botão já está marcado como travado, cancela o evento imediatamente.
 * Se não está, marca-o para bloquear os próximos 3 s.
 */
function handleGlobalClick(e) {
  const btn = e.target.closest('button, input[type="submit"], a[role="button"]');
  if (!btn) return;

  // Já travado: bloqueia o clique duplicado antes de qualquer handler
  if (btn.dataset.locked === 'true') {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }

  // Primeiro clique: deixa passar normalmente e agenda o desbloqueio
  btn.dataset.locked = 'true';
  btn.classList.add(LOCKED_CLASS);

  setTimeout(() => {
    btn.dataset.locked = 'false';
    btn.classList.remove(LOCKED_CLASS);
  }, LOCK_DURATION);
}

/**
 * Inicia o sistema de travamento global de botões.
 * Deve ser chamado uma única vez por página.
 */
export function initButtonLock() {
  document.addEventListener('click', handleGlobalClick, true);
}
