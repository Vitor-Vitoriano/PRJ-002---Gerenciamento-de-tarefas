import { SprintCard } from "./components/SprintCard.js";

// ESTADO GLOBAL DO MÓDULO
let estadoSprints = [];
let estadoTarefas = [];
let estadoUsuarios = [];

export async function renderBacklogPage() {
  const app = document.querySelector("#view-backlog");
  if (!app) return;

  // Resgata o projeto ativo blindando contra valores inválidos de texto "undefined"
  let activeProjectId = "";
  try {
    const projectRaw = localStorage.getItem("currentProject");
    if (projectRaw && projectRaw !== "undefined" && projectRaw !== null) {
      const currentProject = JSON.parse(projectRaw);
      activeProjectId = currentProject.id || "";
    }
  } catch (e) {
    console.error("Erro ao ler currentProject do localStorage:", e);
  }

  if (!activeProjectId) {
    app.innerHTML = `<div class="text-center py-12 text-slate-400">Selecione ou crie um projeto para gerenciar o Backlog.</div>`;
    return;
  }

    try {
      // Busca os dados do projeto (sprints + tasks + members) em uma única chamada
        const [resProject, resUsers] = await Promise.all([
        fetch(`https://taskflow-api-glvv.onrender.com/api/projects/${activeProjectId}`),
        fetch(`https://taskflow-api-glvv.onrender.com/api/users`)
      ]);

      if (!resProject.ok) throw new Error('Falha ao buscar dados do projeto');

      const projectData = await resProject.json();
      const project = projectData.project || {};

      estadoSprints = project.sprints || [];

      const tarefasBrutas = project.tasks || [];
      estadoTarefas = tarefasBrutas.map(task => ({
        ...task,
        dueDate: task.dueDate ? formatarDataParaExibicao(task.dueDate) : "-"
      }));

      estadoUsuarios = await resUsers.json();
    } catch (error) {
      console.error("Erro ao sincronizar Backlog com o banco:", error);
    }

  // ALIMENTAÇÃO CORRIGIDA: Vincula dinamicamente os usuários do banco mantendo o placeholder inicial
  const userOptions = estadoUsuarios.length > 0
  ? estadoUsuarios.map(user => `<option value="${user.name}">${user.name}</option>`).join("")
  : `<option value="" disabled>Nenhum usuário cadastrado</option>`;

  app.innerHTML = `
      <div class="space-y-6">
        
        <div class="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">Backlog</h1>
            <p class="text-sm text-gray-500">Planeje seu escopo e organize suas sprints diretamente no banco.</p>
          </div>
          
          <button id="add-sprint" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 transition shadow-sm">
            <i class="ph ph-plus-circle text-lg"></i>
            Nova Sprint
          </button>
        </div>

        <div class="space-y-6">
          ${
            estadoSprints.length > 0
              ? estadoSprints
                  .map((sprint) => {
                    const sprintTasks = estadoTarefas.filter(task => task.sprintId === sprint.id);
                    const isSprintFinished = sprintTasks.length > 0 && sprintTasks.every(task => task.status === "done" || task.status === "concluido");

                    return `
                      <div class="relative group">
                        ${isSprintFinished ? `
                          <div class="absolute -top-3 right-4 z-10 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                            <i class="ph ph-check-circle text-sm"></i>
                            Sprint Concluída
                          </div>
                        ` : ''}
                        ${SprintCard(sprint, sprintTasks)}
                      </div>
                    `;
                  })
                  .join("")
              : `<div class="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">Nenhuma sprint criada no banco de dados. Clique em 'Nova Sprint' para começar.</div>`
          }
        </div>

      </div>

      <div id="sprint-modal-overlay" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
          <h3 id="sprint-modal-title" class="text-lg font-bold text-slate-800">Nova Sprint</h3>
          <p class="text-slate-500 text-sm mb-4">Insira os dados de planejamento da etapa.</p>
          
          <form id="sprint-form" class="space-y-4">
            <input type="hidden" id="sprint-edit-id" value="" />

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Sprint *</label>
              <input 
                id="sprint-title-input" 
                type="text" 
                placeholder="Ex: Sprint 05 — Gestão de Tarefas" 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Início *</label>
                <input 
                  id="sprint-start-date" 
                  type="date" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
                  required
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Término *</label>
                <input 
                  id="sprint-end-date" 
                  type="date" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
                  required
                />
              </div>
            </div>
            
            <p id="sprint-date-error" class="hidden text-xs text-red-500 font-medium -mt-1"></p>
            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" id="cancel-sprint" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition">
                Cancelar
              </button>
              <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-sm">
                Salvar Sprint
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="mvp-task-modal-overlay" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
          <h3 id="mvp-task-modal-title" class="text-lg font-bold text-slate-800">Nova Tarefa</h3>
          <p class="text-slate-500 text-sm mb-4">Insira os detalhes da tarefa vinculada ao banco.</p>
          
          <form id="mvp-task-form" class="space-y-4">
            <input type="hidden" id="mvp-task-sprint-id" value="" />
            <input type="hidden" id="mvp-task-edit-id" value="" />

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Tarefa *</label>
              <input 
                id="mvp-task-title" 
                type="text" 
                placeholder="Ex: CRUD completo de tarefas" 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
              <textarea 
                id="mvp-task-desc" 
                rows="3"
                placeholder="Detalhes sobre o que precisa ser feito..." 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 resize-none"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Início</label>
                <input 
                  id="mvp-task-start-date" 
                  type="date" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Término</label>
                <input 
                  id="mvp-task-end-date" 
                  type="date" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável *</label>
                <select 
                  id="mvp-task-responsible" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
                  required
                >
                  <option value="" disabled selected>Selecione um membro...</option>
                  ${userOptions}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade *</label>
                <select id="mvp-task-priority" class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 bg-white">
                  <option value="low">baixa</option>
                  <option value="medium" selected>média</option>
                  <option value="high">alta</option>
                </select>
              </div>
            </div>
            
            <p id="task-date-error" class="hidden text-xs text-red-500 font-medium -mt-1"></p>
            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" id="cancel-mvp-task" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition">
                Cancelar
              </button>
              <button type="submit" id="mvp-task-submit-btn" class="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-sm">
                Criar Tarefa
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="mvp-detail-modal-overlay" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70]">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100 space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <span id="detail-task-id" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">TASK</span>
              <h3 id="detail-task-title" class="text-xl font-bold text-slate-800 mt-2">Título da Tarefa</h3>
            </div>
            <button type="button" id="close-detail-modal" class="text-slate-400 hover:text-slate-600 transition">
              <i class="ph ph-x text-xl"></i>
            </button>
          </div>

          <hr class="border-slate-100" />

          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl text-xs">
            <div>
              <span class="block text-slate-400 font-medium mb-0.5">Responsável</span>
              <span id="detail-task-responsible" class="font-bold text-slate-700">-</span>
            </div>
            <div>
              <span class="block text-slate-400 font-medium mb-0.5">Prioridade</span>
              <span id="detail-task-priority" class="font-bold uppercase">-</span>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição detalhada</h4>
            <div id="detail-task-desc" class="text-sm text-slate-600 bg-slate-50/50 border border-slate-100 rounded-xl p-4 min-h-[100px] whitespace-pre-wrap">
              Nenhum detalhe inserido.
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button type="button" id="close-detail-modal-btn" class="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-sm">
              Fechar Janela
            </button>
          </div>
        </div>
      </div>
  `;

  setupEvents();
}

function setupEvents() {
  const sprintModal = document.querySelector("#sprint-modal-overlay");
  const sprintForm = document.querySelector("#sprint-form");
  const taskModal = document.querySelector("#mvp-task-modal-overlay");
  const taskForm = document.querySelector("#mvp-task-form");
  const detailModal = document.querySelector("#mvp-detail-modal-overlay");
  const sweetAlertInstance = typeof Swal !== "undefined" ? Swal : null;

  // Resgata o projeto de forma segura também no bloco de eventos
  let activeProjectId = "";
  try {
    const projectRaw = localStorage.getItem("currentProject");
    if (projectRaw && projectRaw !== "undefined" && projectRaw !== null) {
      const currentProject = JSON.parse(projectRaw);
      activeProjectId = currentProject.id || "";
    }
  } catch (e) {}

  const closeDetailModal = () => detailModal.classList.add("hidden");
  document.querySelector("#close-detail-modal")?.addEventListener("click", closeDetailModal);
  document.querySelector("#close-detail-modal-btn")?.addEventListener("click", closeDetailModal);

  const app = document.querySelector("#view-backlog");
  if (app) {
    app.onclick = async function (e) {
      
      // =============================================================
      // MUDANÇA FLUXO: CAPTURA O BOTÃO "MOVER PARA KANBAN" ASSÍNCRONO
      // =============================================================
      const sendToKanbanBtn = e.target.closest(".send-sprint-to-kanban-btn");
      if (sendToKanbanBtn) {
        e.preventDefault();
        e.stopPropagation();

        const sprintId = sendToKanbanBtn.dataset.sprintId;
        if (!sprintId) return;

        try {
          const response = await fetch(`https://taskflow-api-glvv.onrender.com/api/sprints/${sprintId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "EM ANDAMENTO" })
          });

          if (response.ok) {
            // 🌟 ATUALIZAÇÃO DO DASHBOARD EM TEMPO REAL: Força a recarga do Kanban se ele já existir na memória
            if (typeof window.reloadKanbanDashboard === "function") {
              window.reloadKanbanDashboard();
            }

            if (sweetAlertInstance) {
              sweetAlertInstance.fire({
                title: "Sprint Iniciada!",
                text: "As tarefas agora estão disponíveis no quadro Kanban.",
                icon: "success",
                confirmButtonColor: "#1e293b",
              });
            } else {
              alert("Sprint movida para o Kanban com sucesso!");
            }
            renderBacklogPage();
          } else {
            console.error("Erro ao atualizar o status da sprint no servidor.");
          }
        } catch (err) {
          console.error("Erro na requisição de mover para o Kanban:", err);
        }
        return;
      }

      const editSprintBtn = e.target.closest(".edit-sprint-btn") || e.target.closest(".ph-pencil")?.parentElement;
      if (editSprintBtn && !editSprintBtn.classList.contains("edit-task-btn") && !editSprintBtn.classList.contains("delete-sprint-btn")) {
        e.preventDefault();
        e.stopPropagation();
        
        const sprintId = editSprintBtn.dataset.sprintId;
        const sprint = estadoSprints.find((s) => s.id === sprintId);

        if (sprint) {
          document.querySelector("#sprint-modal-title").textContent = "Editar Sprint";
          document.querySelector("#sprint-edit-id").value = sprint.id;
          document.querySelector("#sprint-title-input").value = sprint.name || "";
          
          document.querySelector("#sprint-start-date").value = sprint.startDate ? sprint.startDate.split("T")[0] : "";
          document.querySelector("#sprint-end-date").value = sprint.endDate ? sprint.endDate.split("T")[0] : "";
          
          sprintModal.classList.remove("hidden");
        }
        return;
      }
      
      const editTaskBtn = e.target.closest(".edit-task-btn") || 
                          e.target.closest(".ph-pencil-simple")?.parentElement;

      if (editTaskBtn && !editTaskBtn.classList.contains("delete-task-btn") && !e.target.closest(".delete-task-btn") && !editTaskBtn.classList.contains("delete-sprint-btn") && !editTaskBtn.classList.contains("edit-sprint-btn")) {
        
        e.preventDefault();
        e.stopPropagation();
        
        const taskId = editTaskBtn.dataset.taskId || editTaskBtn.closest("[data-task-id]")?.dataset.taskId;
        const task = estadoTarefas.find((t) => t.id === taskId);

        if (task) {
          document.querySelector("#mvp-task-modal-title").textContent = "Editar Tarefa";
          document.querySelector("#mvp-task-submit-btn").textContent = "Salvar Alterações";
          
          document.querySelector("#mvp-task-edit-id").value = task.id;
          document.querySelector("#mvp-task-sprint-id").value = task.sprintId || "";
          document.querySelector("#mvp-task-title").value = task.title || "";
          
          document.querySelector("#mvp-task-desc").value = task.desc || "";
          document.querySelector("#mvp-task-priority").value = task.priority || "medium";
          document.querySelector("#mvp-task-responsible").value = task.responsible || "";
          
          if (task.dueDate && task.dueDate !== "-") {
            const partes = task.dueDate.split("/");
            if (partes.length === 3) {
              document.querySelector("#mvp-task-end-date").value = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }
          } else {
            document.querySelector("#mvp-task-end-date").value = "";
          }

          document.querySelector("#mvp-task-start-date").value = task.startDate ? task.startDate.split("T")[0] : "";

          taskModal.classList.remove("hidden");
        }
        return;
      }

      const deleteGenericTaskBtn = e.target.closest(".delete-task-btn") || e.target.closest(".ph-trash")?.parentElement;
      if (deleteGenericTaskBtn && !deleteGenericTaskBtn.classList.contains("delete-sprint-btn")) {
        
        const taskId = deleteGenericTaskBtn.dataset.taskId;
        if (taskId) {
          e.preventDefault();
          e.stopPropagation();

          const ejecutarExclusaoTarefa = async () => {
             try {
                await fetch(`https://taskflow-api-glvv.onrender.com/api/tasks/${taskId}`, { method: "DELETE" });
                renderBacklogPage();
             } catch (err) { console.error("Erro ao deletar:", err); }
          };

          if (sweetAlertInstance) {
            sweetAlertInstance.fire({
              title: "Excluir tarefa?",
              text: "Essa ação não poderá ser desfeita.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#1e293b",
              confirmButtonText: "Sim, excluir",
              cancelButtonText: "Cancelar",
            }).then((result) => { if (result.isConfirmed) ejecutarExclusaoTarefa(); });
          } else {
            if (confirm("Excluir tarefa?")) ejecutarExclusaoTarefa();
          }
          return;
        }
      }

      const deleteSprintBtn = e.target.closest(".delete-sprint-btn");
      if (deleteSprintBtn) {
        e.preventDefault();
        e.stopPropagation();
        const sprintId = deleteSprintBtn.dataset.sprintId;

        const ejecutarExclusaoSprint = async () => {
          try {
            await fetch(`https://taskflow-api-glvv.onrender.com/api/sprints/${sprintId}`, { method: "DELETE" });
            renderBacklogPage();
          } catch (err) { console.error(err); }
        };

        if (sweetAlertInstance) {
          sweetAlertInstance.fire({
            title: "Excluir sprint?",
            text: "Todas as tarefas vinculadas também serão removidas.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#1e293b",
            confirmButtonText: "Sim, excluir",
            cancelButtonText: "Cancelar",
          }).then((result) => { if (result.isConfirmed) ejecutarExclusaoSprint(); });
        } else {
          if (confirm("Excluir sprint?")) ejecutarExclusaoSprint();
        }
        return;
      }
    };
  }

  document.querySelectorAll(".task-row-clickable").forEach((row) => {
    row.onclick = function (e) {
      if (
        e.target.closest("button") || 
        e.target.closest("td:last-child") || 
        e.target.classList.contains("ph-pencil-simple") || 
        e.target.classList.contains("ph-trash")
      ) {
        return;
      }

      const taskId = row.dataset.taskId;
      const task = estadoTarefas.find((t) => t.id === taskId);

      if (task) {
        document.querySelector("#detail-task-title").textContent = task.title;
        document.querySelector("#detail-task-responsible").textContent = task.responsible || "Sem responsável";
        document.querySelector("#detail-task-priority").textContent = task.priority || "média";
        document.querySelector("#detail-task-desc").textContent = task.desc || "Nenhum detalhe inserido.";
        detailModal.classList.remove("hidden");
      }
    };
  });

  if (sprintForm) {
    sprintForm.onsubmit = async (e) => {
      e.preventDefault();
      const sprintName = document.querySelector("#sprint-title-input").value;
      const startDate = document.querySelector("#sprint-start-date").value;
      const endDate = document.querySelector("#sprint-end-date").value;
      const editId = document.querySelector("#sprint-edit-id").value;

      if (!activeProjectId) return;

      // Validação: data de término não pode ser anterior à de início
      if (startDate && endDate && endDate < startDate) {
        const errEl = document.querySelector("#sprint-date-error");
        if (errEl) { errEl.textContent = "A data de término não pode ser anterior à de início."; errEl.classList.remove("hidden"); }
        return;
      }
      const errEl = document.querySelector("#sprint-date-error");
      if (errEl) errEl.classList.add("hidden");

      const payload = {
        name: sprintName,
        projectId: activeProjectId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      try {
        if (editId) {
          await fetch(`https://taskflow-api-glvv.onrender.com/api/sprints/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch("https://taskflow-api-glvv.onrender.com/api/sprints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }

        sprintModal.classList.add("hidden");
        renderBacklogPage();
      } catch (err) {
        console.error("Erro ao gerenciar sprint:", err);
      }
    };
  }

  document.querySelectorAll(".add-task-to-sprint").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#mvp-task-modal-title").textContent = "Nova Tarefa";
      document.querySelector("#mvp-task-submit-btn").textContent = "Criar Tarefa";
      document.querySelector("#mvp-task-edit-id").value = "";
      document.querySelector("#mvp-task-sprint-id").value = button.dataset.sprintId;
      document.querySelector("#mvp-task-title").value = "";
      document.querySelector("#mvp-task-desc").value = "";
      document.querySelector("#mvp-task-priority").value = "medium";
      document.querySelector("#mvp-task-responsible").value = "";
      
      document.querySelector("#mvp-task-start-date").value = "";
      document.querySelector("#mvp-task-end-date").value = "";

      taskModal.classList.remove("hidden");
    });
  });

  if (taskForm) {
    taskForm.onsubmit = async (e) => {
      e.preventDefault();
      const editId = document.querySelector("#mvp-task-edit-id").value;
      const taskTitle = document.querySelector("#mvp-task-title").value;
      const description = document.querySelector("#mvp-task-desc").value;
      const priority = document.querySelector("#mvp-task-priority").value;
      const sprintId = document.querySelector("#mvp-task-sprint-id").value;
      const responsible = document.querySelector("#mvp-task-responsible").value;
      const startDate = document.querySelector("#mvp-task-start-date").value;
      const endDate = document.querySelector("#mvp-task-end-date").value;

      if (!activeProjectId) return;

      // Validação: data de término não pode ser anterior à de início
      if (startDate && endDate && endDate < startDate) {
        const taskErrEl = document.querySelector("#task-date-error");
        if (taskErrEl) { taskErrEl.textContent = "A data de término não pode ser anterior à de início."; taskErrEl.classList.remove("hidden"); }
        return;
      }
      const taskErrEl = document.querySelector("#task-date-error");
      if (taskErrEl) taskErrEl.classList.add("hidden");

      const payload = {
        title: taskTitle,
        description: description,
        priority: priority,
        responsible: responsible,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId: activeProjectId,
        sprintId: sprintId || null
      };

      try {
        if (editId) {
          await fetch(`https://taskflow-api-glvv.onrender.com/api/tasks/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } else {
          payload.status = "todo";
          await fetch("https://taskflow-api-glvv.onrender.com/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }

        taskModal.classList.add("hidden");
        renderBacklogPage();
      } catch (err) {
        console.error("Erro ao salvar tarefa:", err);
      }
    };
  }

  document.querySelector("#cancel-sprint")?.addEventListener("click", () => sprintModal.classList.add("hidden"));
  document.querySelector("#cancel-mvp-task")?.addEventListener("click", () => taskModal.classList.add("hidden"));

  // Atualiza o min da data de término sempre que a data de início mudar
  document.querySelector("#sprint-start-date")?.addEventListener("change", function () {
    const endInput = document.querySelector("#sprint-end-date");
    if (!endInput) return;
    endInput.min = this.value;
    if (endInput.value && endInput.value < this.value) {
      endInput.value = this.value;
      const errEl = document.querySelector("#sprint-date-error");
      if (errEl) { errEl.textContent = "A data de término foi ajustada para a data de início."; errEl.classList.remove("hidden"); }
    }
  });

  document.querySelector("#mvp-task-start-date")?.addEventListener("change", function () {
    const endInput = document.querySelector("#mvp-task-end-date");
    if (!endInput) return;
    endInput.min = this.value;
    if (endInput.value && endInput.value < this.value) {
      endInput.value = this.value;
      const taskErrEl = document.querySelector("#task-date-error");
      if (taskErrEl) { taskErrEl.textContent = "A data de término foi ajustada para a data de início."; taskErrEl.classList.remove("hidden"); }
    }
  });

  document.querySelector("#add-sprint")?.addEventListener("click", () => {
    document.querySelector("#sprint-modal-title").textContent = "Nova Sprint";
    document.querySelector("#sprint-edit-id").value = "";
    document.querySelector("#sprint-title-input").value = "";
    
    document.querySelector("#sprint-start-date").value = "";
    document.querySelector("#sprint-end-date").value = "";
    
    sprintModal.classList.remove("hidden");
  });
}

function formatarDataParaExibicao(dataString) {
  if (!dataString) return "-";
  if (dataString.includes('/')) return dataString; 
  
  const dataLimpa = dataString.split('T')[0];
  const partes = dataLimpa.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataString;
}