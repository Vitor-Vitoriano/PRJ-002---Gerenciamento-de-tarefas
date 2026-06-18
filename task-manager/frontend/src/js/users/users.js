const API = "https://taskflow-api-glvv.onrender.com/api";

const ROLE_LABEL = { ADMIN: "Admin", MANAGER: "Gerente", MEMBER: "Membro" };
const ROLE_CLASS = {
  ADMIN:   "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100   text-blue-700",
  MEMBER:  "bg-slate-100  text-slate-600",
};

function getLoggedUser() {
  try { return JSON.parse(localStorage.getItem("usuarioLogado") || "{}"); }
  catch { return {}; }
}

export async function renderUsersPage() {
  const container = document.getElementById("view-users");
  if (!container) return;

  const me = getLoggedUser();

  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
          <p class="text-sm text-slate-500 mt-0.5">Visualize e gerencie todos os usuários cadastrados no sistema.</p>
        </div>
        <span id="users-count" class="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full"></span>
      </div>

      <div id="users-error" class="hidden mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium"></div>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50">
              <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-3">Usuário</th>
              <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-3">E-mail</th>
              <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-3">Perfil</th>
              <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-3">Cadastro</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <i class="ph ph-spinner text-2xl animate-spin block mb-2"></i>
                Carregando usuários...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de confirmação de exclusão -->
    <div id="delete-user-modal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 animate-modal">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <i class="ph ph-warning text-red-500 text-xl"></i>
          </div>
          <h3 class="text-base font-bold text-slate-800">Excluir usuário</h3>
        </div>
        <p class="text-sm text-slate-500 mb-1">Tem certeza que deseja excluir <strong id="delete-user-name" class="text-slate-700"></strong>?</p>
        <p class="text-xs text-red-500 font-medium mb-5">Esta ação é irreversível e removerá o usuário permanentemente.</p>
        <div class="flex justify-end gap-2">
          <button id="delete-user-cancel" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition">
            Cancelar
          </button>
          <button id="delete-user-confirm" class="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition shadow-sm">
            Excluir
          </button>
        </div>
      </div>
    </div>
  `;

  await loadUsers(me);
  setupDeleteModal(me);
}

async function loadUsers(me) {
  const tbody = document.getElementById("users-tbody");
  const countEl = document.getElementById("users-count");
  const errEl = document.getElementById("users-error");

  try {
    const res = await fetch(`${API}/users`);
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-slate-400">Nenhum usuário encontrado.</td></tr>`;
      return;
    }

    if (countEl) countEl.textContent = `${users.length} usuário${users.length !== 1 ? "s" : ""}`;

    tbody.innerHTML = users.map(user => {
      const isMe = user.id === me.id;
      const roleKey = (user.role || "MEMBER").toUpperCase();
      const roleLabel = ROLE_LABEL[roleKey] || roleKey;
      const roleClass = ROLE_CLASS[roleKey] || ROLE_CLASS.MEMBER;
      const date = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
      const initials = (user.name || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

      return `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-user-id="${user.id}" data-user-name="${user.name}">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${initials}</div>
              <span class="font-semibold text-slate-800">${user.name}${isMe ? ' <span class="text-xs font-normal text-slate-400">(você)</span>' : ""}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-slate-500">${user.email}</td>
          <td class="px-6 py-4">
            <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleClass}">${roleLabel}</span>
          </td>
          <td class="px-6 py-4 text-slate-400 text-xs">${date}</td>
          <td class="px-6 py-4 text-right">
            ${isMe
              ? `<span class="text-xs text-slate-300 italic">—</span>`
              : `<button class="delete-user-btn text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Excluir usuário">
                   <i class="ph ph-trash text-base"></i>
                 </button>`
            }
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Erro ao carregar usuários:", err);
    if (errEl) { errEl.textContent = "Não foi possível carregar os usuários. Tente novamente."; errEl.classList.remove("hidden"); }
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Erro ao carregar dados.</td></tr>`;
  }
}

function setupDeleteModal(me) {
  const modal = document.getElementById("delete-user-modal");
  const nameEl = document.getElementById("delete-user-name");
  const cancelBtn = document.getElementById("delete-user-cancel");
  const confirmBtn = document.getElementById("delete-user-confirm");
  const errEl = document.getElementById("users-error");

  let targetId = null;

  // Delegação de cliques na tabela
  document.getElementById("users-tbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-user-btn");
    if (!btn) return;
    const row = btn.closest("tr[data-user-id]");
    if (!row) return;
    targetId = row.dataset.userId;
    nameEl.textContent = row.dataset.userName;
    modal.classList.remove("hidden");
  });

  cancelBtn?.addEventListener("click", () => { modal.classList.add("hidden"); targetId = null; });
  modal?.addEventListener("click", (e) => { if (e.target === modal) { modal.classList.add("hidden"); targetId = null; } });

  confirmBtn?.addEventListener("click", async () => {
    if (!targetId) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Excluindo...";

    try {
      const res = await fetch(`${API}/users/${targetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");

      modal.classList.add("hidden");
      targetId = null;
      await loadUsers(me);
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      if (errEl) { errEl.textContent = "Erro ao excluir usuário. Tente novamente."; errEl.classList.remove("hidden"); }
      modal.classList.add("hidden");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Excluir";
    }
  });
}
