// src/js/kanban/kanban.js

import { columns } from "../utils/dom.js";
import { createCard } from "./cards.js";

// Arquivos locais (estão na mesma pasta kanban/)
import { setupDragAndDrop } from "./dragdrop.js";
import { setupEvents } from "./events.js";
import { updateCounts } from "./counters.js";
import { sortColumn } from "./sort.js";

// O search.js foi para a pasta app/
import { setupSearch } from "../app/search.js";

// Aponta para a pasta projects/
import { getActiveProjectId } from "../projects/projects.js";

export function initKanban() {
  async function loadTasks() {
    // 1. LIMPEZA SEGURA: Reseta o HTML interno de cada uma das colunas
    if (columns.todo) columns.todo.innerHTML = "";
    if (columns.doing) columns.doing.innerHTML = "";
    if (columns.testing) columns.testing.innerHTML = "";
    if (columns.review) columns.review.innerHTML = "";
    if (columns.done) columns.done.innerHTML = "";

    const currentProject = JSON.parse(localStorage.getItem("currentProject") || "{}");
    const activeProjectId = currentProject.id || getActiveProjectId();

    if (!activeProjectId) {
      updateCounts();
      return;
    }

    try {
      // Busca Tarefas e Sprints em paralelo do PostgreSQL via API
      const [responseTasks, responseSprints] = await Promise.all([
        fetch(`https://taskflow-api-glvv.onrender.com/api/tasks?projectId=${activeProjectId}`),
        fetch(`https://taskflow-api-glvv.onrender.com/api/sprints?projectId=${activeProjectId}`)
      ]);

      const tasks = await responseTasks.json();
      const sprints = await responseSprints.json();

      // Filtra tarefas que pertencem ao Kanban (ignora o backlog)
      const kanbanTasks = tasks.filter(task => 
        task.status !== "backlog" && 
        task.column !== "backlog"
      );

      // Filtra apenas tarefas de sprints iniciadas ("EM ANDAMENTO")
      const tarefasAutorizadas = kanbanTasks.filter(task => {
        const sprintDaTarefa = sprints.find(s => String(s.id) === String(task.sprintId));
        return sprintDaTarefa && 
               sprintDaTarefa.status && 
               sprintDaTarefa.status.toUpperCase() === "EM ANDAMENTO";
      });

      // 🌟 SALVA NA WINDOW: Guarda as tarefas carregadas para a Etapa 3 (Modal de Detalhes)
      window.kanbanTasksLoaded = tarefasAutorizadas;

      // 2. RENDERIZAÇÃO: Injeta os cards criados no DOM
      tarefasAutorizadas.forEach((task) => {
        const card = createCard(task);

        if (task.column === "done" || task.status === "done" || task.status === "concluido") {
          const titleEl = card.querySelector("h4") || card.querySelector(".card-title") || card;
          if (titleEl) {
            titleEl.classList.add("line-through", "opacity-60");
          }
        }

        const columnMap = {
          todo: columns.todo,
          doing: columns.doing,
          testing: columns.testing,
          review: columns.review,
          done: columns.done
        };

        const targetColumn = columnMap[task.column] || columnMap[task.status];
        if (targetColumn) {
          targetColumn.appendChild(card);
        }
      });

      // 🌟 ETAPA 1 CORRIGIDA: Ativa o Drag & Drop APENAS AGORA, com os cards já criados na tela!
      setupDragAndDrop();
      
      // Executa a ordenação das colunas
      Object.values(columns).forEach((column) => {
        if (column) sortColumn(column);
      });

      // Atualiza os contadores numéricos do topo das colunas
      updateCounts();

    } catch (error) {
      console.error("❌ Erro ao carregar tarefas do PostgreSQL no Kanban:", error);
    }
  }

  setupSearch();
  setupEvents(createCard);
  
  // Carga inicial
  loadTasks();

  // Sincronização em tempo real vinda do backlog.page.js
  window.reloadKanbanDashboard = loadTasks;
}
