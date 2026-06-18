// Estado global do módulo de projetos (Sincronizado com o Back-end)
let projects = [];
let activeProjectId = localStorage.getItem('taskflow_active_project_id') || '';
let isEditing = false; 

// Elementos do DOM
const projectSelector = document.getElementById('project-selector');
const projectModalOverlay = document.getElementById('project-modal-overlay');
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectNameError = document.getElementById('project-name-error');
const projectManagerSelect = document.getElementById('project-manager');
const projectMembersContainer = document.getElementById('project-members-container');

// Elementos adicionais para trocar os textos do modal dinamicamente
const modalTitle = projectModalOverlay ? projectModalOverlay.querySelector('h3') : null;
const modalSubmitBtn = projectForm ? projectForm.querySelector('button[type="submit"]') : null;

// Elementos de gatilho/abertura
const btnOpenProjectModal = document.getElementById('btn-open-project-modal');
const btnWelcomeCreateProject = document.getElementById('btn-welcome-create-project');
const btnCancelProject = document.getElementById('cancel-project');

// Botões de Editar e Excluir
const btnEditProject = document.getElementById('btn-edit-project');
const btnDeleteProject = document.getElementById('btn-delete-project');

// Views do Sistema para controle de exibição
const viewEmptyProject = document.getElementById('view-empty-project');
const viewKanban = document.getElementById('view-kanban');
const viewBacklog = document.getElementById('view-backlog');
const viewDashboard = document.getElementById('view-dashboard');

/**
 * Inicializa os eventos e carrega os dados do back-end
 */
export async function initProjects() {
    // Ouvintes para abrir/fechar modal (Modo Criação)
    if (btnOpenProjectModal) btnOpenProjectModal.addEventListener('click', () => openModal(false));
    if (btnWelcomeCreateProject) btnWelcomeCreateProject.addEventListener('click', () => openModal(false));
    if (btnCancelProject) {
        btnCancelProject.addEventListener('click', closeModal);
    }
    
    // Ouvinte do formulário unificado
    if (projectForm) projectForm.addEventListener('submit', handleSaveProject);
    
    // Ouvinte da mudança de projeto ativo
    if (projectSelector) {
        projectSelector.addEventListener('change', (e) => {
            setActiveProject(e.target.value);
        });
    }

    // Ouvintes: Ações do projeto ativo
    if (btnEditProject) btnEditProject.addEventListener('click', () => openModal(true));
    if (btnDeleteProject) btnDeleteProject.addEventListener('click', handleDeleteProject);

    // Carrega projetos vindos da API do banco de dados
    await fetchProjectsFromBackend();
}

/**
 * Busca a lista de projetos do Back-end baseada no usuário logado
 */
async function fetchProjectsFromBackend() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const userId = usuarioLogado ? usuarioLogado.id : '';
    const token = usuarioLogado ? usuarioLogado.token : '';

    try {
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`https://taskflow-api-glvv.onrender.com/api/projects?userId=${userId}`, {
            headers: headers
        });
        if (!response.ok) throw new Error("Erro ao carregar projetos do servidor.");
        
        projects = await response.json();
        
        // Se o projeto ativo sumiu ou não está na lista, seleciona o primeiro disponível
        if (projects.length > 0 && !projects.some(p => p.id === activeProjectId)) {
            activeProjectId = projects[0].id;
            localStorage.setItem('taskflow_active_project_id', activeProjectId);
        }

        renderProjectSelector();
        checkActiveProjectView();
    } catch (error) {
        console.error("❌ Erro ao sincronizar projetos com o banco:", error);
    }
}

/**
 * Renderiza dinamicamente gerentes e membros buscando da API do PostgreSQL
 */
async function populateSystemUsers() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const token = usuarioLogado ? usuarioLogado.token : '';

    try {
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch("https://taskflow-api-glvv.onrender.com/api/users", {
            headers: headers
        });
        if (!response.ok) throw new Error("Erro ao listar membros na API");
        const systemUsers = await response.json();

        // 1. Popula o Select de Gerente do Projeto
        if (projectManagerSelect) {
            if (!systemUsers || systemUsers.length === 0) {
                projectManagerSelect.innerHTML = `<option value="">Nenhum usuário cadastrado</option>`;
            } else {
                projectManagerSelect.innerHTML = systemUsers.map(user => `
                    <option value="${user.id}">${user.name || user.email}</option>
                `).join('');
            }
        }

        // 2. Popula os Checkboxes de Vincular Membros
        if (projectMembersContainer) {
            if (!systemUsers || systemUsers.length === 0) {
                projectMembersContainer.innerHTML = `<p class="text-xs text-slate-400 italic">Nenhum membro disponível</p>`;
            } else {
                projectMembersContainer.innerHTML = systemUsers.map(user => `
                    <label class="flex items-center gap-2 cursor-pointer select-none p-1 hover:bg-slate-50 rounded">
                        <input type="checkbox" name="project-members" value="${user.id}"
                            class="rounded text-blue-600 focus:ring-blue-500/20">
                        <span class="text-sm text-slate-700">${user.name || user.email}</span>
                    </label>
                `).join('');
            }
        }
    } catch (error) {
        console.error("❌ Falha ao renderizar usuários no modal:", error);
    }
}

/**
 * Abre o modal de criação/edição de projetos
 */
async function openModal(editMode = false) {
    if (!projectModalOverlay) return;
    
    isEditing = editMode;
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));

    // O modal abre instantaneamente ao clicar, sem travar a tela
    projectModalOverlay.classList.remove('hidden');
    if (projectNameInput) projectNameInput.focus();

    if (isEditing) {
        const projectToEdit = projects.find(p => p.id === activeProjectId);
        if (projectToEdit && usuarioLogado && projectToEdit.ownerId !== usuarioLogado.id) {
            alert("Ação negada! Apenas o gerente responsável do projeto pode editá-lo.");
            closeModal();
            return;
        }
    }

    // Carrega a listagem de usuários via API em segundo plano
    await populateSystemUsers();
    
    // Alimenta os campos após o carregamento terminar
    if (isEditing) {
        const projectToEdit = projects.find(p => p.id === activeProjectId);
        if (projectToEdit) {
            projectNameInput.value = projectToEdit.name;
            if (projectManagerSelect) projectManagerSelect.value = projectToEdit.ownerId || '';
            
            const checkboxes = document.querySelectorAll('input[name="project-members"]');
            checkboxes.forEach(cb => {
                cb.checked = projectToEdit.members ? projectToEdit.members.some(m => m.id === cb.value) : false;
            });
        }
        
        if (modalTitle) modalTitle.textContent = 'Editar Projeto';
        if (modalSubmitBtn) modalSubmitBtn.textContent = 'Salvar Alterações';
    } else {
        if (projectForm) projectForm.reset();
        
        // Força a seleção padrão do select de gerentes para o usuário logado atual
        if (projectManagerSelect && usuarioLogado) {
            projectManagerSelect.value = usuarioLogado.id;
        }

        if (modalTitle) modalTitle.textContent = 'Novo Projeto';
        if (modalSubmitBtn) modalSubmitBtn.textContent = 'Salvar Projeto';
    }
}

function closeModal() {
    if (projectModalOverlay) projectModalOverlay.classList.add('hidden');
    if (projectForm) projectForm.reset();
    if (projectNameError) projectNameError.classList.add('hidden');
    isEditing = false;
}

/**
 * Processa o envio salvando diretamente nas rotas da API (PostgreSQL)
 */
async function handleSaveProject(e) {
    e.preventDefault();

    const name = projectNameInput.value.trim();
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const userId = usuarioLogado ? usuarioLogado.id : '';
    const token = usuarioLogado ? usuarioLogado.token : '';
    
    const checkedMembers = Array.from(document.querySelectorAll('input[name="project-members"]:checked'))
        .map(cb => cb.value);

    if (!name) {
        if (projectNameError) projectNameError.classList.remove('hidden');
        return;
    }

    // 🌟 CORREÇÃO CIRÚRGICA: Inclusão do Token de Autenticação nos Headers para evitar o Erro 403
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        if (isEditing) {
            // === ENVIO DE EDIÇÃO (PUT) ===
            const response = await fetch(`https://taskflow-api-glvv.onrender.com/api/projects/${activeProjectId}`, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify({ name: name, memberIds: checkedMembers })
            });

            if (!response.ok) throw new Error("Falha ao atualizar projeto no servidor.");
        } else {
            // === ENVIO DE CRIAÇÃO (POST) ===
            const response = await fetch("https://taskflow-api-glvv.onrender.com/api/projects", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ name: name, userId: userId, memberIds: checkedMembers })
            });

            if (!response.ok) throw new Error("Falha ao cadastrar projeto no servidor.");
            const createdProject = await response.json();
            activeProjectId = createdProject.id;
            localStorage.setItem('taskflow_active_project_id', activeProjectId);
        }

        closeModal();
        window.location.reload();
    } catch (error) {
        console.error("❌ Erro ao salvar projeto:", error);
        alert("Erro de comunicação com o servidor ao salvar o projeto.");
    }
}

/**
 * Remove o projeto invocando a rota DELETE da API
 */
async function handleDeleteProject() {
    if (!activeProjectId) return;

    const projectToDelete = projects.find(p => p.id === activeProjectId);
    if (!projectToDelete) return;

    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const token = usuarioLogado ? usuarioLogado.token : '';
    
    if (usuarioLogado && projectToDelete.ownerId !== usuarioLogado.id) {
        alert("Ação negada! Apenas o gerente responsável do projeto pode excluiu-lo.");
        return;
    }

    const confirmText = `Deseja realmente excluir o projeto "${projectToDelete.name}"?\nEsta ação apagará todas as tarefas vinculadas de forma definitiva.`;
    if (!confirm(confirmText)) return;

    // 🌟 Cabeçalho de Autorização também para a exclusão
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const response = await fetch(`https://taskflow-api-glvv.onrender.com/api/projects/${activeProjectId}`, {
            method: "DELETE",
            headers: headers
        });

        if (!response.ok) throw new Error("Erro na exclusão do servidor.");

        activeProjectId = '';
        localStorage.setItem('taskflow_active_project_id', '');
        window.location.reload();
    } catch (error) {
        console.error("❌ Erro ao excluir projeto:", error);
        alert("Não foi possível deletar o projeto.");
    }
}

function renderProjectSelector() {
    if (!projectSelector) return;
    if (projects.length === 0) {
        projectSelector.innerHTML = '<option value="">Nenhum projeto...</option>';
        return;
    }
    projectSelector.innerHTML = projects.map(proj => `
        <option value="${proj.id}" ${proj.id === activeProjectId ? 'selected' : ''}>
            📁 ${proj.name}
        </option>
    `).join('');
}

function checkActiveProjectView() {
    if (!activeProjectId || projects.length === 0) {
        if (viewEmptyProject) viewEmptyProject.classList.remove('hidden');
        if (viewKanban) viewKanban.classList.add('hidden');
        if (viewBacklog) viewBacklog.classList.add('hidden');
        if (viewDashboard) viewDashboard.classList.add('hidden');
        if (btnEditProject) btnEditProject.classList.add('invisible');
        if (btnDeleteProject) btnDeleteProject.classList.add('invisible');
    } else {
        if (viewEmptyProject) viewEmptyProject.classList.add('hidden');
        
        if (btnEditProject) btnEditProject.classList.remove('invisible');
        if (btnDeleteProject) btnDeleteProject.classList.remove('invisible');

        if (viewKanban && viewKanban.classList.contains('hidden') && 
            viewBacklog.classList.contains('hidden') && 
            viewDashboard.classList.contains('hidden')) {
            viewKanban.classList.remove('hidden');
        }
    }
}

function setActiveProject(id) {
    activeProjectId = id;
    localStorage.setItem('taskflow_active_project_id', id);
    checkActiveProjectView();
    window.location.reload(); 
}

export function getActiveProjectId() {
    return activeProjectId;
}