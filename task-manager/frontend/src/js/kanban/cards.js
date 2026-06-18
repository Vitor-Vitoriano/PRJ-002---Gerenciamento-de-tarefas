// src/js/kanban/cards.js
import { openDashboardEditModal } from "./events.js";
import { editingCard } from "./state.js";
import { saveTasks, getTasks } from "../utils/storage.js";

// 🌟 ETAPA 2: FUNÇÃO AUXILIAR PARA FORMATAR A DATA NO PADRÃO BRASILEIRO
function formatarDataCard(dataString) {
  if (!dataString) return "";
  if (dataString.includes('/')) return dataString; 
  
  const dataLimpa = dataString.split('T')[0];
  const partes = dataLimpa.split('-');
  
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataString;
}

export function createCard(task) {
  const card = document.createElement("div");
  card.className = "task-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-3 relative group";
  card.draggable = true;
  card.dataset.id = task.id;

  // 🌟 MAPEA O CAMPO DO PRISMA (.desc) PARA MANTER COMPATIBILIDADE INTERNA
  const descricaoTarefa = task.desc || task.description || "";

  const priorityColors = {
    high: "bg-red-50 text-red-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-green-50 text-green-600",
    alta: "bg-red-50 text-red-600",
    média: "bg-amber-50 text-amber-600",
    baixa: "bg-green-50 text-green-600"
  };

  const priorityLabel = {
    high: "ALTA",
    medium: "MÉDIA",
    low: "BAIXA",
    alta: "ALTA",
    média: "MÉDIA",
    baixa: "BAIXA"
  };

  const currentPriority = (task.priority || "medium").toLowerCase();
  const badgeClass = priorityColors[currentPriority] || "bg-slate-50 text-slate-600";
  const labelText = priorityLabel[currentPriority] || "MÉDIA";

  const obtenerIniciais = (nome) => {
    if (!nome) return "??";
    const partes = nome.trim().split(" ");
    if (partes.length > 1) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  };

  const iniciaisAvatar = obtenerIniciais(task.responsible);
  
  // 🌟 ETAPA 2: FORMATANDO O PRAZO EXIBIDO NO CARD VISUAL
  const dataPrazoCard = formatarDataCard(task.dueDate || task.date || task.prazo);

  card.innerHTML = `
    <div class="flex justify-between items-start gap-2">
      <span class="text-xs font-bold px-2 py-0.5 rounded-md tracking-wider ${badgeClass}">
        ${labelText}
      </span>
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="btn-edit-card p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition" title="Editar tarefa">
          <i class="ph ph-pencil-simple text-base"></i>
        </button>
        <button class="btn-delete-card p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition" title="Excluir tarefa">
          <i class="ph ph-trash text-base"></i>
        </button>
      </div>
    </div>

    <div>
      <h4 class="text-sm font-bold text-slate-800">${task.title}</h4>
      ${descricaoTarefa ? `<p class="text-xs text-slate-400 mt-1 line-clamp-2">${descricaoTarefa}</p>` : ""}
    </div>

    <div class="flex items-center justify-between pt-2 text-xs text-slate-400">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase" title="${task.responsible || 'Sem responsável'}">
          ${iniciaisAvatar}
        </div>
      </div>
      ${dataPrazoCard ? `
        <div class="flex items-center gap-1 text-slate-400">
          <i class="ph ph-calendar-blank text-sm"></i>
          <span>${dataPrazoCard}</span>
        </div>
      ` : ""}
    </div>
  `;

  // -------------------------------------------------------------
  // CLIQUE NO CARD INTEIRO - DETALHES E COMENTÁRIOS
  // -------------------------------------------------------------
  card.addEventListener("click", (e) => {
    if (e.target.closest('.btn-edit-card') || e.target.closest('.btn-delete-card') || e.target.closest('button')) {
      return; 
    }

    const oldModal = document.getElementById("mvp-detail-modal-overlay-kanban");
    if (oldModal) oldModal.remove();

    const priorityLabels = { high: "ALTA", medium: "MÉDIA", low: "BAIXA", alta: "ALTA", media: "MÉDIA", baixa: "BAIXA" };
    const currentPriority = (task.priority || task.prioridade || "medium").toLowerCase();
    const priorityText = priorityLabels[currentPriority] || "MÉDIA";
    const taskDisplayId = task.taskCode || task.formattedId || task.code || (task.id ? task.id.substring(0, 5).toUpperCase() : 'TF-1');

    const loggedUserRaw = localStorage.getItem('usuarioLogado');
    let currentUsername = "Anônimo";

    if (loggedUserRaw) {
      try {
        const parsed = JSON.parse(loggedUserRaw);
        currentUsername = parsed.nome || parsed.username || parsed.user || parsed.login || "Usuário";
      } catch (err) {
        currentUsername = loggedUserRaw.replace(/"/g, '').trim();
      }
    }

    // 🌟 ETAPA 2: FORMATANDO A DATA DE DENTRO DO MODAL DE DETALHES
    const dataPrazoModal = formatarDataCard(task.dueDate || task.prazo || task.date);

    const modalHTML = `
      <div id="mvp-detail-modal-overlay-kanban" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70]">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex justify-between items-start">
            <div>
              <span id="detail-task-id-kanban" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">${taskDisplayId}</span>
              <h3 id="detail-task-title-kanban" class="text-xl font-bold text-slate-800 mt-2">
                ${task.title || task.nome || "Tarefa sem título"}
              </h3>
            </div>
            <button type="button" id="close-detail-modal-kanban" class="text-slate-400 hover:text-slate-600 transition">
              <i class="ph ph-x text-xl"></i>
            </button>
          </div>

          <hr class="border-slate-100" />

          <div class="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-xl text-xs">
            <div>
              <span class="block text-slate-400 font-medium mb-0.5">Responsável</span>
              <span id="detail-task-responsible-kanban" class="font-bold text-slate-700">${task.responsible || task.responsavel || "Sem responsável"}</span>
            </div>
            <div>
              <span class="block text-slate-400 font-medium mb-0.5">Prazo</span>
              <span id="detail-task-date-kanban" class="font-bold text-slate-700">${dataPrazoModal || "Sem prazo"}</span>
            </div>
            <div>
              <span class="block text-slate-400 font-medium mb-0.5">Prioridade</span>
              <span id="detail-task-priority-kanban" class="font-bold uppercase text-slate-700">${priorityText}</span>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição detalhada</h4>
            <div id="detail-task-desc-kanban" class="text-sm text-slate-600 bg-slate-50/50 border border-slate-100 rounded-xl p-4 min-h-[80px] whitespace-pre-wrap">${descricaoTarefa || "Nenhum detalhe inserido."}</div>
          </div>

          <hr class="border-slate-100" />

          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <i class="ph ph-chat-centered-text text-sm"></i> Comentários
            </h4>
            
            <div class="flex gap-2">
              <input 
                id="comment-input-kanban" 
                type="text" 
                placeholder="Escreva um comentário..." 
                class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
              <button 
                id="btn-add-comment-kanban" 
                class="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition"
              >
                Enviar
              </button>
            </div>

            <div id="comments-container-kanban" class="space-y-2 max-h-[200px] overflow-y-auto pr-1"></div>
          </div>

          <div class="flex justify-end pt-2">
            <button type="button" id="close-detail-modal-btn-kanban" class="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-sm">
              Fechar Janela
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const createdModal = document.getElementById("mvp-detail-modal-overlay-kanban");
    const containerComentarios = document.getElementById("comments-container-kanban");
    const inputComentario = document.getElementById("comment-input-kanban");
    const btnAdicionarComentario = document.getElementById("btn-add-comment-kanban");

    const carregarComentarios = () => {
      const todos = JSON.parse(localStorage.getItem("kanban_comments") || "[]");
      return todos.filter(c => c.taskId === task.id);
    };

    const salvarComentariosGlobais = (novosDaTask) => {
      const todos = JSON.parse(localStorage.getItem("kanban_comments") || "[]");
      const filtrados = todos.filter(c => c.taskId !== task.id);
      localStorage.setItem("kanban_comments", JSON.stringify([...filtrados, ...novosDaTask]));
    };

    const renderizarListaComentarios = () => {
      const lista = carregarComentarios();
      
      if (lista.length === 0) {
        containerComentarios.innerHTML = `<p class="text-xs text-slate-400 italic py-2">Nenhum comentário ainda.</p>`;
        return;
      }

      containerComentarios.innerHTML = lista.map(comment => `
        <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs space-y-1 relative group" data-comment-id="${comment.id}">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-700">${comment.user}</span>
            <span class="text-[10px] text-slate-400">${comment.date}</span>
          </div>
          
          <p class="text-slate-600 view-text-comment whitespace-pre-wrap">${comment.text}</p>
          
          <div class="edit-box-comment hidden flex gap-1 mt-1">
            <input type="text" class="w-full border rounded-lg px-2 py-1 text-xs input-edit-comment focus:outline-none" value="${comment.text}">
            <button class="bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-bold btn-save-edit">Salvar</button>
            <button class="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold btn-cancel-edit">Sair</button>
          </div>

          <div class="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition bg-slate-50 pl-1">
            <button class="text-slate-400 hover:text-slate-600 btn-trigger-edit" title="Editar">
              <i class="ph ph-pencil-simple text-sm"></i>
            </button>
            <button class="text-slate-400 hover:text-red-500 btn-trigger-delete" title="Excluir">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </div>
        </div>
      `).join("");
    };

    const adicionarNovoComentario = () => {
      const texto = inputComentario.value.trim();
      if (!texto) return;

      const listaAtual = carregarComentarios();
      
      listaAtual.push({
        id: crypto.randomUUID(),
        taskId: task.id,
        user: currentUsername,
        text: texto,
        date: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      salvarComentariosGlobais(listaAtual);
      inputComentario.value = "";
      renderizarListaComentarios();
    };

    btnAdicionarComentario.addEventListener("click", adicionarNovoComentario);
    inputComentario.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        adicionarNovoComentario();
      }
    });

    containerComentarios.addEventListener("click", (event) => {
      const itemCard = event.target.closest("[data-comment-id]");
      if (!itemCard) return;
      
      const commentId = itemCard.dataset.commentId;
      const listaAtual = carregarComentarios();

      if (event.target.closest(".btn-trigger-edit")) {
        itemCard.querySelector(".view-text-comment").classList.add("hidden");
        itemCard.querySelector(".edit-box-comment").classList.remove("hidden");
        return;
      }

      if (event.target.closest(".btn-cancel-edit")) {
        itemCard.querySelector(".view-text-comment").classList.remove("hidden");
        itemCard.querySelector(".edit-box-comment").classList.add("hidden");
        return;
      }

      if (event.target.closest(".btn-save-edit")) {
        const novoTexto = itemCard.querySelector(".input-edit-comment").value.trim();
        if (!novoTexto) return;

        const listaModificada = listaAtual.map(c => c.id === commentId ? { ...c, text: novoTexto } : c);
        salvarComentariosGlobais(listaModificada);
        renderizarListaComentarios();
        return;
      }

      if (event.target.closest(".btn-trigger-delete")) {
        if (confirm("Deseja realmente apagar este comentário?")) {
          salvarComentariosGlobais(listaAtual.filter(c => c.id !== commentId));
          renderizarListaComentarios();
        }
        return;
      }
    });

    renderizarListaComentarios();

    const closeXBtn = document.getElementById("close-detail-modal-kanban");
    const closeBtn = document.getElementById("close-detail-modal-btn-kanban");
    const destroyModal = () => { if (createdModal) createdModal.remove(); };

    closeXBtn?.addEventListener("click", destroyModal);
    closeBtn?.addEventListener("click", destroyModal);
    createdModal?.addEventListener("click", (event) => { if (event.target === createdModal) destroyModal(); });
  });

  // -----------------------------------------------------------------
  // CLIQUE NO BOTÃO EDITAR
  // -----------------------------------------------------------------
  const editBtn = card.querySelector(".btn-edit-card");
  if (editBtn) {
    editBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const modalElement = document.getElementById("task-modal");
      if (!modalElement) {
        console.error("Modal #task-modal não encontrado no HTML!");
        return;
      }

      modalElement.classList.remove("hidden");

      const titleInput = document.getElementById("task-title");
      if (titleInput) titleInput.value = task.title || task.nome || "";

      const descInput = document.getElementById("task-desc");
      if (descInput) descInput.value = task.desc || task.description || task.descricao || "";

      const prioritySelect = document.getElementById("task-priority");
      if (prioritySelect) prioritySelect.value = task.priority || task.prioridade || "medium";

      const dateInput = document.getElementById("task-date");
      if (dateInput) {
        let dateVal = task.dueDate || task.prazo || task.date || "";
        if (dateVal.includes("/")) {
          dateVal = dateVal.split("/").reverse().join("-");
        }
        dateInput.value = dateVal;
      }

      const cancelBtn = modalElement.querySelector(".btn-secondary") || document.getElementById("cancel-edit-btn") || modalElement.querySelector("button[type='button']");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          modalElement.classList.add("hidden");
        }, { once: true });
      }

      const formElement = document.getElementById("task-form") || modalElement.querySelector("form");
      if (formElement) {
        formElement.onsubmit = (event) => {
          event.preventDefault();

          const rawDate = dateInput ? dateInput.value : "";
          const formattedDate = rawDate && rawDate.includes("-")
            ? rawDate.split("-").reverse().join("/")
            : rawDate;

          task.title = titleInput ? titleInput.value : task.title;
          task.desc = descInput ? descInput.value : task.desc; // Alinha com o Prisma
          task.description = descInput ? descInput.value : task.description;
          task.priority = prioritySelect ? prioritySelect.value : task.priority;
          task.dueDate = formattedDate; 

          const cardTitleElement = card.querySelector("h4") || card.querySelector(".card-title");
          if (cardTitleElement) cardTitleElement.innerText = task.title;
          
          const cardDescElement = card.querySelector("p");
          if (cardDescElement) cardDescElement.innerText = task.desc || task.description;

          const cardDateContainer = card.querySelector(".ph-calendar-blank")?.parentElement;
          if (cardDateContainer) {
            if (formattedDate) {
              cardDateContainer.innerHTML = `<i class="ph ph-calendar-blank text-sm"></i> <span>${formatarDataCard(formattedDate)}</span>`;
            } else {
              cardDateContainer.remove(); 
            }
          }

          try {
            const allTasks = getTasks();
            const index = allTasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
              allTasks[index] = task;
              saveTasks(allTasks);
            }
          } catch (storageErr) {
            console.error("Erro ao salvar a tarefa atualizada no storage:", storageErr);
          }

          modalElement.classList.add("hidden");
          if (window.reloadKanbanDashboard) window.reloadKanbanDashboard();
        };
      }
    });
  }

  // BOTAO DELETAR
  const deleteBtn = card.querySelector(".btn-delete-card");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ejecutarExclusao = () => {
        const allTasks = getTasks();
        const filtered = allTasks.filter(t => t.id !== task.id);
        saveTasks(filtered);
        card.remove();
        if (window.reloadKanbanDashboard) window.reloadKanbanDashboard();
      };

      if (typeof Swal !== "undefined") {
        Swal.fire({
          title: "Excluir tarefa?",
          text: "Essa ação removerá a tarefa do quadro permanentemente.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#1e293b",
          confirmButtonText: "Sim, excluir",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) ejecutarExclusao();
        });
      } else {
        if (confirm("Deseja realmente excluir esta tarefa permanentemente?")) {
          ejecutarExclusao();
        }
      }
    });
  }

  card.addEventListener("dragstart", () => card.classList.add("opacity-40"));
  card.addEventListener("dragend", () => card.classList.remove("opacity-40"));

  return card;
}