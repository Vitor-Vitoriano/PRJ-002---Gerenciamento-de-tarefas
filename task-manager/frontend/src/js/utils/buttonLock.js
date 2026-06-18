/**
 * buttonLock.js
 * Trava todos os botões do sistema por 3 segundos após o primeiro clique.
 * Evita double-submit, cliques acidentais e requisições duplicadas.
 */

const LOCK_DURATION = 3000; // ms
const LOCKED_CLASS = 'btn-locked';

/**
 * Aplica o travamento em um botão específico.
 * @param {HTMLElement} btn
 */
function lockButton(btn) {
  if (btn.disabled || btn.dataset.locked === 'true') return;

  btn.dataset.locked = 'true';
  btn.disabled = true;
  btn.classList.add(LOCKED_CLASS);

  // Guarda o texto/conteúdo original para restaurar depois
  const originalText = btn.innerHTML;

  setTimeout(() => {
    btn.disabled = false;
    btn.dataset.locked = 'false';
    btn.classList.remove(LOCKED_CLASS);
    btn.innerHTML = originalText;
  }, LOCK_DURATION);
}

/**
 * Listener global: captura qualquer clique em <button> ou <input type="submit">
 * em fase de captura (antes dos handlers da aplicação), trava o elemento
 * clicado e desbloqueio após 3 s.
 */
function handleGlobalClick(e) {
  const target = e.target.closest('button, input[type="submit"], a[role="button"]');
  if (!target) return;

  lockButton(target);
}

/**
 * Inicia o sistema de travamento global de botões.
 * Deve ser chamado uma única vez, o mais cedo possível.
 */
export function initButtonLock() {
  document.addEventListener('click', handleGlobalClick, true); // captura
}
