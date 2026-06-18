// src/js/kanban/dragdrop.js
import Sortable from "sortablejs";
import { columns } from "../utils/dom.js";
import { updateCounts } from "./counters.js";
import { sortColumn } from "./sort.js";

export function setupDragAndDrop() {
  const allColumns = [
    columns.todo,
    columns.doing,
    columns.testing,
    columns.review,
    columns.done
  ];

  allColumns.forEach((column) => {
    if (!column) return;

    Sortable.create(column, {
      group: "kanban",
      animation: 200,
      ghostClass: "opacity-50",
      dragClass: "rotate-2",
      onEnd: async (evt) => {
        const cardElement = evt.item;
        const taskId = cardElement.getAttribute("data-id") || cardElement.id;
        const targetColumnId = evt.to.id; // Ex: 'todo', 'doing', 'testing', 'review', 'done'

        if (taskId && targetColumnId) {
          // 1. Aplica feedbacks visuais na tela imediatamente (Efeito de Riscado)
          const titleEl = cardElement.querySelector("h4") || cardElement.querySelector(".card-title") || cardElement;
          
          if (targetColumnId === "done") {
            if (titleEl) titleEl.classList.add("line-through", "opacity-60");
          } else {
            if (titleEl) titleEl.classList.remove("line-through", "opacity-60");
          }

          // 2. CORRIGIDO: ENVIANDO PARA O ENDPOINT CORRETO DO CONTROLLER (PUT /tasks/:id)
          try {
            const response = await fetch(`https://taskflow-api-glvv.onrender.com/api/tasks/${taskId}`, {
              method: "PUT", // 🌟 Mudado de PATCH para PUT para casar com as rotas do back-end
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ 
                status: targetColumnId, // 🌟 Passando o payload esperado pelo prisma
                column: targetColumnId 
              })
            });

            if (!response.ok) {
              console.error("❌ Falha ao salvar a nova posição da tarefa no banco.");
            } else {
              console.log(`✅ Tarefa ${taskId} movida para a coluna ${targetColumnId} com sucesso no banco!`);
            }
          } catch (error) {
            console.error("❌ Erro de rede ao tentar atualizar o status no banco:", error);
          }
        }

// 3. Atualiza os componentes visuais locais (Ordenação e Contadores das colunas)
        sortColumn(evt.to);
        sortColumn(evt.from);
        updateCounts();

        // Linhas removidas/comentadas para evitar que o Kanban pisque
        // if (window.reloadKanbanDashboard) {
        //   window.reloadKanbanDashboard();
        // }
      },
    });
  });
}