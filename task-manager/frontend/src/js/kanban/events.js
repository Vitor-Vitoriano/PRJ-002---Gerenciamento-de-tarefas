import {
  modal,
  taskForm,
  addTaskBtn,
  closeModalBtn,
  cancelModalBtn,
  taskTitle,
  taskDesc,
  taskPriority,
  taskDate
} from "../utils/dom.js";

// CORREÇÃO: Como o state.js está na mesma pasta local (kanban/), usamos "./"
import { editingCard } from "./state.js"; 

// CORREÇÃO: Como o toggleModal está dentro do modal.js na mesma pasta local, usamos "./"
import { toggleModal } from "./modal.js";

// Busca a lista de usuários cadastrados no sistema
function getSystemUsers() {
  const usersRaw = localStorage.getItem('users') || '[]';
  try {
    const users = JSON.parse(usersRaw);
    return Array.isArray(users) ? users : [];
  } catch (e) {
    return [];
  }
}

// Alimenta o elemento select com os usuários e marca o atual como selecionado
function populateResponsibleSelect(currentValue) {
  const respSelect = document.getElementById("task-responsible");
  if (!respSelect) return;

  const users = getSystemUsers();
  
  // Limpa e define a opção padrão
  respSelect.innerHTML = `<option value="" disabled ${!currentValue ? 'selected' : ''}>Nome do responsável</option>`;
  
  // Injeta os usuários do banco
  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.username;
    if (user.username === currentValue) {
      option.selected = true;
    }
    respSelect.appendChild(option);
  });
}

export function openDashboardEditModal(task) {
  // 1. Busca os elementos diretamente para evitar problemas de importação do dom.js
  const titleText = document.getElementById("modal-title-text");
  const descText = document.getElementById("modal-desc-text");
  const formElement = document.getElementById("task-form") || taskForm;
  
  const inputTitle = document.getElementById("task-title");
  const inputDesc = document.getElementById("task-desc");
  const inputPriority = document.getElementById("task-priority");
  const inputDate = document.getElementById("task-date");
  
  const submitBtn = formElement ? formElement.querySelector('button[type="submit"]') : null;

  // 2. Muda os textos de cabeçalho do modal para Edição
  if (titleText) titleText.textContent = "Editar Tarefa";
  if (descText) descText.textContent = "Insira ou modifique os detalhes da tarefa no backlog.";
  if (submitBtn) submitBtn.textContent = "Salvar Alterações";

  // 3. Preenche os campos de texto e seletores (verifica se eles existem antes)
  if (inputTitle) inputTitle.value = task.title || "";
  if (inputDesc) inputDesc.value = task.description || "";
  if (inputPriority) inputPriority.value = task.priority || "medium";
  if (inputDate) inputDate.value = task.dueDate || task.date || "";

  // 4. Preenche dinamicamente o select de responsáveis com o dono da task marcado
  populateResponsibleSelect(task.responsible);

  // 5. Guarda o ID da tarefa sendo editada no formulário para usarmos no submit
  if (formElement) {
    formElement.dataset.editingId = task.id;
  }

  // 6. FORÇA A ABERTURA DO MODAL (Chama a sua função ou remove a classe 'hidden' direto)
  if (typeof toggleModal === "function") {
    toggleModal();
  } else {
    const modalElement = document.getElementById("task-modal") || modal;
    if (modalElement) modalElement.classList.remove("hidden");
  }
}

export function setupEvents(createCard) {
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
      const titleText = document.getElementById("modal-title-text");
      const descText = document.getElementById("modal-desc-text");
      const submitBtn = taskForm ? taskForm.querySelector('button[type="submit"]') : null;

      if (titleText) titleText.textContent = "Nova Tarefa";
      if (descText) descText.textContent = "Crie uma nova tarefa para o seu workspace.";
      if (submitBtn) submitBtn.textContent = "Criar Tarefa";
      
      // Garante que o formulário NÃO está em modo de edição
      if (taskForm) delete taskForm.dataset.editingId;
      
      populateResponsibleSelect("");
      toggleModal();
    });
  }

  // Ouvinte centralizado para o Submit do Formulário (Criação E Edição)
  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
      // Se houver um ID salvo no dataset, significa que estamos EDITANDO
      if (taskForm.dataset.editingId) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Evita que outros scripts chamem a criação

        const taskId = taskForm.dataset.editingId;
        const localStorageTasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const respSelect = document.getElementById("task-responsible");
        
        // Pega a tarefa base para manter o restante dos dados
        const tarefaOriginal = localStorageTasks.find(t => String(t.id) === String(taskId)) || {};

        const dadosAtualizados = {
          ...tarefaOriginal,
          title: taskTitle.value,
          description: taskDesc.value,
          desc: taskDesc.value, // Mantém compatibilidade com o Prisma
          responsible: respSelect ? respSelect.value : tarefaOriginal.responsible,
          priority: taskPriority.value,
          dueDate: taskDate.value,
          date: taskDate.value
        };

        const updatedTasks = localStorageTasks.map(t => {
          if (String(t.id) === String(taskId)) return dadosAtualizados;
          return t;
        });

        localStorage.setItem("tasks", JSON.stringify(updatedTasks));

        try {
          // Salva na API PostgreSQL
          await fetch(`https://taskflow-api-glvv.onrender.com/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
          });
        } catch (error) {
          console.error("Erro ao enviar edição para API:", error);
        }

        // Fecha o modal limpando os campos
        toggleModal();

        // Recarrega o quadro do Kanban instantaneamente
        if (window.reloadKanbanDashboard) {
          window.reloadKanbanDashboard();
        } else {
          window.location.reload();
        }
      }
      // Se não houver dataset.editingId, ele não entra aqui e deixa 
      // o evento original do seu sistema criar a tarefa normalmente!
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => toggleModal());
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleModal();
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) toggleModal();
    });
  }
}