// main.js
import '../../css/style.css';

import {
    checkAuth,
    initUserUI
} from '../auth/session.js';

import { initBacklogModal } from "../backlog/backlog.modal.js";
import { setupSidebar } from "./sidebar.js";
import { initKanban } from "../kanban/kanban.js";
import { initDashboardMetrics } from "../dashboard/dashboard.js";
import { initProjects } from "../projects/projects.js";

// 1. Verifica segurança local (Guarda de rota)
const usuario = checkAuth();

// 2. Se estiver logado, inicia a carga assíncrona com o Banco de Dados
if (usuario) {
    initUserUI(usuario);

    // Função interna isolada para resolver a comunicação com o PostgreSQL ordenadamente
    (async function inicializarSistemaComBanco() {
        try {
            // === ETAPA 1: GERENCIAMENTO DE PROJETO ===
            // Busca os projetos do usuário logado na API
            const resProjetos = await fetch(`https://taskflow-api-glvv.onrender.com/api/projects?userId=${usuario.id}`);
            let projetos = await resProjetos.json();

            // 🔧 CORREÇÃO: NÃO criar projeto/sprint automaticamente.
            // Antes, uma conta nova já nascia com um projeto "TaskFlow Backend" e uma
            // "Sprint 01" fabricados, então a tela "Criar meu projeto" nunca aparecia.
            // Agora: se a conta não tem projeto, limpamos o estado e deixamos o módulo
            // de projetos (initProjects -> checkActiveProjectView) exibir a tela vazia.
            if (Array.isArray(projetos) && projetos.length > 0) {
                // Já existe projeto: define o ativo e carrega APENAS as sprints já existentes
                const projetoAtivo = projetos[0];
                localStorage.setItem("currentProject", JSON.stringify(projetoAtivo));
                console.log(`📂 Projeto ativo carregado do banco: ${projetoAtivo.name} (ID: ${projetoAtivo.id})`);

                // === ETAPA 2: GERENCIAMENTO DE SPRINTS (sem criação automática) ===
                const resSprints = await fetch(`https://taskflow-api-glvv.onrender.com/api/sprints?projectId=${projetoAtivo.id}`);
                const sprints = await resSprints.json();
                localStorage.setItem("sprints", JSON.stringify(Array.isArray(sprints) ? sprints : []));
                console.log(`🏃‍♂️ Sprints carregadas do banco para este projeto: ${Array.isArray(sprints) ? sprints.length : 0}`);
            } else {
                // Conta nova / sem projetos: começa zerada e mostra "Criar meu projeto"
                localStorage.removeItem("currentProject");
                localStorage.setItem("sprints", JSON.stringify([]));
                console.log("🆕 Nenhum projeto encontrado — exibindo tela de criação do primeiro projeto.");
            }


            // === ETAPA 3: BASE DE TAREFAS ===
            // Apenas para manter compatibilidade temporária enquanto migramos o Kanban por completo
            localStorage.setItem("taskflow_tasks", JSON.stringify([]));


            // === ETAPA 4: INICIALIZAÇÃO DA INTERFACE ===
            // Agora que os dados cruciais do banco existem localmente, chamamos as telas com segurança
            await initProjects();
            initBacklogModal();
            setupSidebar();
            initKanban();
            initDashboardMetrics();

        } catch (error) {
            console.error("❌ Erro crítico ao carregar dados do banco PostgreSQL:", error);
        }
    })();

    // 🔧 RBAC Fase 4 — Gating de interface por papel.
    // MEMBER é operacional: só usa o Kanban. Não pode criar/editar/excluir
    // projetos nem acessar Backlog, Relatórios e Dashboard.
    aplicarPermissoesPorPapel(usuario);
}

/**
 * Esconde/mostra elementos da interface conforme a role do usuário logado.
 * As roles são: ADMIN, MANAGER, MEMBER (definidas no back-end).
 */
function aplicarPermissoesPorPapel(usuario) {
    const role = String(usuario.role || "").toUpperCase();
    const isMember = role === "MEMBER";

    const esconder = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    };

    if (isMember) {
        // Menus restritos (apenas Kanban fica disponível para o MEMBER)
        ["btn-dashboard", "btn-backlog", "btn-reports"].forEach(esconder);

        // Ações de projeto que o MEMBER não pode executar
        [
            "btn-open-project-modal",     // abrir modal "Novo Projeto"
            "btn-welcome-create-project", // botão da tela vazia "criar meu projeto"
            "btn-edit-project",
            "btn-delete-project"
        ].forEach(esconder);
    } else {
        // MANAGER/ADMIN: garante que o Relatórios apareça (era oculto no código antigo)
        const btnReports = document.getElementById("btn-reports");
        if (btnReports) btnReports.style.display = "";
    }
}
