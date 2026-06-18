/**
 * src/js/reports/reports.js
 * Módulo de Relatórios - Versão Final Premium com PDF e Excel Funcionais
 */

import { checkAuth } from "../auth/session.js";

let allTasks = [];
let allProjects = [];
let filteredTasks = [];

const selection = {
  project: new Set(),
  status: new Set(),
  responsible: new Set(),
};

const DEFAULT_LABELS = {
  project: "Todos os projetos",
  status: "Todos os status",
  responsible: "Todos os responsáveis",
};

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
  } catch {
    return {};
  }
}

function getCurrentProject() {
  try {
    return JSON.parse(localStorage.getItem("currentProject") || "{}");
  } catch {
    return {};
  }
}

function hasReportsAccess(user) {
  const role = String(user?.role || "").toUpperCase();
  const currentProject = getCurrentProject();
  return role === "ADMIN" || role === "MANAGER" || currentProject.ownerId === user?.id;
}

function getActiveProjectId() {
  const storedProjectId = localStorage.getItem("taskflow_active_project_id");
  if (storedProjectId) return storedProjectId;

  const currentProject = getCurrentProject();
  return currentProject.id || currentProject.projectId || currentProject._id || "";
}

// Função exigida pelo navigation.js para transitar entre abas sem erros
export async function reloadReports() {
  await loadDatabaseData();
}

function setupDropdown(ddId, filterKey) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const trigger = dd.querySelector(".rf-dd-trigger");
  const panel = dd.querySelector(".rf-dd-panel");
  if (!trigger || !panel) return;

  trigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = !panel.classList.contains("hidden");
    document.querySelectorAll(".rf-dd-panel").forEach(p => p.classList.add("hidden"));
    if (!isOpen) panel.classList.remove("hidden");
  };
}

function renderDropdownOptions(containerId, ddId, filterKey, options) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = options.map(({ value, label }) => `
    <label class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
      <input type="checkbox" value="${escapeHtml(value)}" ${selection[filterKey].has(value.toString()) ? "checked" : ""} class="rounded border-slate-300 text-blue-600 focus:ring-blue-500">
      <span>${escapeHtml(label)}</span>
    </label>
  `).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.onchange = () => {
      if (cb.checked) {
        selection[filterKey].add(cb.value);
      } else {
        selection[filterKey].delete(cb.value);
      }
      updateTriggerLabel(ddId, filterKey, options);
      applyFilters();
    };
  });
}

function updateTriggerLabel(ddId, filterKey, options) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const label = dd.querySelector(".rf-dd-label");
  if (!label) return;

  const sel = selection[filterKey];
  if (sel.size === 0) {
    label.textContent = DEFAULT_LABELS[filterKey];
  } else if (sel.size === 1) {
    const val = [...sel][0];
    const opt = options.find(o => o.value.toString() === val.toString());
    label.textContent = opt ? opt.label : val;
  } else {
    label.textContent = `${sel.size} selecionados`;
  }
}

export async function initReports() {
  const user = checkAuth();
  if (!user || !hasReportsAccess(user)) return;

  setupDropdown("dd-project", "project");
  setupDropdown("dd-status", "status");
  setupDropdown("dd-responsible", "responsible");

  document.addEventListener("click", () => {
    document.querySelectorAll(".rf-dd-panel").forEach(p => p.classList.add("hidden"));
  });

  await loadDatabaseData();

  const elClear = document.getElementById("btn-clear-filters");
  if (elClear) elClear.onclick = clearFilters;

  const btnPdf = document.getElementById("btn-export-pdf");
  if (btnPdf) {
    btnPdf.onclick = (e) => {
      e.preventDefault();
      exportToPDF();
    };
  }

  const btnExcel = document.getElementById("btn-export-excel");
  if (btnExcel) {
    btnExcel.onclick = (e) => {
      e.preventDefault();
      exportToExcel();
    };
  }
}

async function loadDatabaseData() {
  try {
    const user = getCurrentUser();
    const headers = {};
    if (user.token) headers.Authorization = `Bearer ${user.token}`;

    const userParam = user.id ? `?userId=${encodeURIComponent(user.id)}` : "";
    const projResponse = await fetch(`https://taskflow-api-glvv.onrender.com/api/projects${userParam}`, { headers });
    allProjects = projResponse.ok ? await projResponse.json() : [];

    const activeProjectId = getActiveProjectId();
    
    if (activeProjectId) {
      const tasksResponse = await fetch(`https://taskflow-api-glvv.onrender.com/api/tasks?projectId=${encodeURIComponent(activeProjectId)}`, { headers });
      allTasks = tasksResponse.ok ? await tasksResponse.json() : [];
    } else {
      allTasks = [];
    }

    populateFilters();
    applyFilters();
  } catch (error) {
    console.error("❌ Erro ao sincronizar dados nos relatórios:", error);
  }
}

function populateFilters() {
  // Ajusta o nome do projeto vindo do banco para exibir de maneira amigável
  const projOpts = allProjects.map(p => {
    let cleanName = p.name;
    if (cleanName.toLowerCase().includes("backend")) {
      cleanName = cleanName.replace(/backend/i, "").trim();
    } else if (cleanName.toLowerCase().includes("back end")) {
      cleanName = cleanName.replace(/back end/i, "").trim();
    } else if (cleanName.toLowerCase().includes("back-end")) {
      cleanName = cleanName.replace(/back-end/i, "").trim();
    }
    if (!cleanName) cleanName = "TaskFlow";

    return { value: p.id, label: cleanName };
  });
  
  renderDropdownOptions("filter-project", "dd-project", "project", projOpts);
  updateTriggerLabel("dd-project", "project", projOpts);

  const statusOpts = [
    { value: "todo", label: "A fazer" },
    { value: "doing", label: "Em andamento" },
    { value: "testing", label: "Em teste" },
    { value: "review", label: "Em revisão" },
    { value: "done", label: "Concluída" }
  ];
  renderDropdownOptions("filter-status", "dd-status", "status", statusOpts);
  updateTriggerLabel("dd-status", "status", statusOpts);

  const names = [...new Set(allTasks.map(t => t.responsible).filter(Boolean))].sort();
  const respOpts = names.map(r => ({ value: r, label: r }));
  renderDropdownOptions("filter-responsible", "dd-responsible", "responsible", respOpts);
  updateTriggerLabel("dd-responsible", "responsible", respOpts);
}

function applyFilters() {
  const projectSel = selection.project;
  const statusSel = selection.status;
  const responsibleSel = selection.responsible;

  filteredTasks = allTasks.filter(task => {
    if (projectSel.size > 0) {
      const tProjId = (task.project_id || task.projectId || "").toString();
      const taskProjectName = (getProjectName(tProjId) || "").toLowerCase().trim();
      
      const matchesProject = [...projectSel].some(selId => {
        if (selId.toString() === tProjId) return true;
        const selProj = allProjects.find(p => p.id.toString() === selId.toString());
        if (selProj) {
          const selName = selProj.name.toLowerCase().trim();
          return taskProjectName.includes(selName) || selName.includes(taskProjectName);
        }
        return false;
      });

      if (!matchesProject) return false;
    }

    if (statusSel.size > 0) {
      const col = (task.column || task.status || "").toLowerCase().trim();
      let cat = "todo";
      if (["doing", "em andamento"].includes(col)) cat = "doing";
      else if (["testing", "em teste"].includes(col)) cat = "testing";
      else if (["review", "em revisão"].includes(col)) cat = "review";
      else if (["done", "concluido", "concluída"].includes(col)) cat = "done";
      if (!statusSel.has(cat)) return false;
    }

    const tResp = (task.responsible || "Não atribuído").trim();
    if (responsibleSel.size > 0 && !responsibleSel.has(tResp)) return false;

    return true;
  });

  renderTable(filteredTasks);
  updateSummary(filteredTasks);
}

function clearFilters() {
  selection.project.clear();
  selection.status.clear();
  selection.responsible.clear();
  populateFilters();
  applyFilters();
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch { return "—"; }
}

function formatDateOnly(dateStr) {
  if (!dateStr) return "—";
  try {
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("pt-BR");
  } catch { return dateStr; }
}

function calcDuration(startIso, endIso) {
  if (!startIso || !endIso) return "—";
  try {
    const diffMs = new Date(endIso) - new Date(startIso);
    if (diffMs < 0 || isNaN(diffMs)) return "—";
    const totalMin = Math.floor(diffMs / 60000);
    return `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, "0")}min`;
  } catch { return "—"; }
}

function getProjectName(projectId) {
  const id = projectId || getActiveProjectId();
  const p = allProjects.find(proj => proj.id.toString() === id.toString());
  if (!p) return "TaskFlow";
  
  let cleanName = p.name;
  cleanName = cleanName.replace(/backend/i, "").replace(/back end/i, "").replace(/back-end/i, "").trim();
  return cleanName || "TaskFlow";
}

function renderTable(tasks) {
  const tbody = document.getElementById("report-tbody");
  if (!tbody) return;

  if (tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-sm text-slate-400">Nenhuma tarefa encontrada para os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = tasks.map(task => {
    const status = (task.status || "todo").toLowerCase().trim();
    const dataInicio = status !== "todo" && status !== "backlog" ? task.createdAt : null;
    const dataConclusao = ["done", "concluido", "concluída"].includes(status) ? task.updatedAt : null;

    // Estilização das Badges de Status (Padrão Original do Kanban)
    let statusLabel = "A fazer";
    let statusClass = "bg-slate-100 text-slate-700 border-slate-200";
    
    if (["doing", "em andamento"].includes(status)) {
      statusLabel = "Em andamento";
      statusClass = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (["testing", "em teste"].includes(status)) {
      statusLabel = "Em teste";
      statusClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (["review", "em revisão"].includes(status)) {
      statusLabel = "Em revisão";
      statusClass = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (["done", "concluido", "concluída"].includes(status)) {
      statusLabel = "Concluída";
      statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    // Estilização das Badges de Prioridade
    const priority = (task.priority || "medium").toLowerCase().trim();
    let priorityLabel = "Média";
    let priorityClass = "bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 text-xs";
    
    if (priority === "high" || priority === "alta") {
      priorityLabel = "Alta";
      priorityClass = "bg-rose-50 text-rose-700 font-medium border border-rose-100 rounded-full px-2 py-0.5 text-xs";
    } else if (priority === "medium" || priority === "média" || priority === "media") {
      priorityLabel = "Média";
      priorityClass = "bg-amber-50 text-amber-700 font-medium border border-amber-100 rounded-full px-2 py-0.5 text-xs";
    } else if (priority === "low" || priority === "baixa") {
      priorityLabel = "Baixa";
      priorityClass = "bg-sky-50 text-sky-700 font-medium border border-sky-100 rounded-full px-2 py-0.5 text-xs";
    }

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
        <td class="px-4 py-3.5 text-sm font-medium text-slate-800">${escapeHtml(task.title)}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">${escapeHtml(getProjectName(task.project_id || task.projectId))}</td>
        <td class="px-4 py-3.5">
          <span class="px-2 py-1 rounded-md text-xs font-semibold border ${statusClass}">${statusLabel}</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-600">${escapeHtml(task.responsible || "Não atribuído")}</td>
        <td class="px-4 py-3.5 text-sm text-slate-600 font-mono">${formatDateOnly(task.dueDate)}</td>
        <td class="px-4 py-3.5 text-center"><span class="${priorityClass}">${priorityLabel}</span></td>
        <td class="px-4 py-3.5 text-sm text-slate-500 font-mono">${formatDateTime(dataInicio)}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500 font-mono">${formatDateTime(dataConclusao)}</td>
        <td class="px-4 py-3.5 text-sm font-semibold text-slate-700 font-mono">${calcDuration(dataInicio, dataConclusao)}</td>
      </tr>
    `;
  }).join("");
}

// 📄 FUNÇÃO 1: EXPORTAR PARA PDF (Utiliza a engine de impressão com CSS invisível para esconder a UI)
// 📄 FUNÇÃO: EXPORTAR PARA PDF (Com Design de Relatório Corporativo Isolado)
function exportToPDF() {
  if (filteredTasks.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  // Abre uma janela invisível temporária para gerar o novo design
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.");
    return;
  }
  
  // Monta as linhas da tabela com o novo visual
  const tableRows = filteredTasks.map(task => {
    const status = (task.status || "todo").toLowerCase().trim();
    const dataInicio = status !== "todo" && status !== "backlog" ? task.createdAt : null;
    const dataConclusao = ["done", "concluido", "concluída"].includes(status) ? task.updatedAt : null;

    let statusLabel = "A fazer";
    if (["doing", "em andamento"].includes(status)) statusLabel = "Em andamento";
    else if (["testing", "em teste"].includes(status)) statusLabel = "Em teste";
    else if (["review", "em revisão"].includes(status)) statusLabel = "Em revisão";
    else if (["done", "concluido", "concluída"].includes(status)) statusLabel = "Concluída";

    const priority = (task.priority || "medium").toLowerCase().trim();
    let priorityLabel = "Média";
    if (priority === "high" || priority === "alta") priorityLabel = "Alta";
    else if (priority === "low" || priority === "baixa") priorityLabel = "Baixa";

    return `
      <tr>
        <td><strong>${escapeHtml(task.title)}</strong></td>
        <td>${escapeHtml(getProjectName(task.project_id || task.projectId))}</td>
        <td><span class="badge-status status-${status}">${statusLabel}</span></td>
        <td>${escapeHtml(task.responsible || "Não atribuído")}</td>
        <td class="center font-mono">${formatDateOnly(task.dueDate)}</td>
        <td class="center"><span class="badge-priority priority-${priority}">${priorityLabel}</span></td>
        <td class="font-mono text-muted">${formatDateTime(dataInicio)}</td>
        <td class="font-mono text-muted">${formatDateTime(dataConclusao)}</td>
        <td class="center font-mono font-bold">${calcDuration(dataInicio, dataConclusao)}</td>
      </tr>
    `;
  }).join("");

  // Injeta o HTML estruturado e o CSS de folha timbrada/corporativa
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relatório de Tarefas - TaskFlow</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          background-color: #ffffff;
        }

        /* Cabeçalho Executivo do PDF */
        .pdf-header {
          display: flex;
          justify-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-area h1 {
          font-size: 24px;
          font-weight: 700;
          color: #2563eb;
          margin: 0;
        }
        .logo-area p {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .meta-area {
          text-align: right;
          font-size: 12px;
          color: #64748b;
        }

        .report-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 20px;
        }

        /* Tabela Customizada */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #cbd5e1;
          padding: 12px 8px;
          text-align: left;
        }
        td {
          padding: 12px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:nth-child(even) {
          background-color: #f8fafc/50; /* Linhas alternadas em cinza claro */
        }

        /* Alinhamentos e Estilos Utilitários */
        .center { text-align: center; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 600; }
        .text-muted { color: #64748b; }

        /* Customização das Badges dentro do PDF */
        .badge-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 10px;
        }
        .status-todo { background-color: #f1f5f9; color: #475569; }
        .status-doing { background-color: #dbeafe; color: #1e40af; }
        .status-testing { background-color: #fef3c7; color: #92400e; }
        .status-review { background-color: #f3e8ff; color: #6b21a8; }
        .status-done { background-color: #d1fae5; color: #065f46; }

        .badge-priority {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 10px;
        }
        .priority-high, .priority-alta { background-color: #ffe4e6; color: #991b1b; }
        .priority-medium, .priority-média, .priority-media { background-color: #fef3c7; color: #92400e; }
        .priority-low, .priority-baixa { background-color: #e0f2fe; color: #075985; }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="pdf-header">
        <div class="logo-area">
          <h1>TaskFlow</h1>
          <p>Sistema de Gerenciamento de Projetos e Tarefas</p>
        </div>
        <div class="meta-area">
          <p><strong>Tipo:</strong> Relatório de Desempenho</p>
          <p><strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div class="report-title">
        Listagem Analítica de Tarefas e Ciclo de Vida
      </div>

      <table>
        <thead>
          <tr>
            <th>Tarefa</th>
            <th>Projeto</th>
            <th>Status</th>
            <th>Responsável</th>
            <th style="text-align:center;">Prazo</th>
            <th style="text-align:center;">Prioridade</th>
            <th>Início</th>
            <th>Conclusão</th>
            <th style="text-align:center;">Duração</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `);

  printWindow.document.close();
  
  // Aguarda carregar as fontes e estilos antes de disparar a janela de salvar PDF
  printWindow.onload = function() {
    printWindow.print();
    printWindow.close();
  };
}

// 📊 FUNÇÃO 2: EXPORTAR PARA EXCEL (Gera um CSV limpo com BOM para compatibilidade total de acentuação no Excel)
function exportToExcel() {
  if (filteredTasks.length === 0) {
    alert("Não há dados para exportar no filtro selecionado.");
    return;
  }

  // Cabeçalhos do relatório
  const headers = ["Tarefa", "Projeto", "Status", "Responsável", "Prazo", "Prioridade", "Início", "Conclusão", "Duração"];
  
  // Monta as linhas mapeando a listagem atual filtrada na tela
  const rows = filteredTasks.map(task => {
    const status = (task.status || "todo").toLowerCase().trim();
    const dataInicio = status !== "todo" && status !== "backlog" ? task.createdAt : null;
    const dataConclusao = ["done", "concluido", "concluída"].includes(status) ? task.updatedAt : null;

    let statusLabel = "A fazer";
    if (["doing", "em andamento"].includes(status)) statusLabel = "Em andamento";
    else if (["testing", "em teste"].includes(status)) statusLabel = "Em teste";
    else if (["review", "em revisão"].includes(status)) statusLabel = "Em revisão";
    else if (["done", "concluido", "concluída"].includes(status)) statusLabel = "Concluída";

    const priority = (task.priority || "medium").toLowerCase().trim();
    let priorityLabel = "Média";
    if (priority === "high" || priority === "alta") priorityLabel = "Alta";
    else if (priority === "low" || priority === "baixa") priorityLabel = "Baixa";

    return [
      task.title,
      getProjectName(task.project_id || task.projectId),
      statusLabel,
      task.responsible || "Não atribuído",
      formatDateOnly(task.dueDate),
      priorityLabel,
      formatDateTime(dataInicio),
      formatDateTime(dataConclusao),
      calcDuration(dataInicio, dataConclusao)
    ].map(val => `"${String(val).replace(/"/g, '""')}"`); // Trata aspas para evitar quebra de colunas
  });

  // Une os cabeçalhos e linhas usando ponto e vírgula (padrão do Excel em português)
  const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  
  // Adiciona o BOM (\uFEFF) para forçar o Excel a ler os caracteres em UTF-8 corretamente
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Relatorio_Tarefas_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateSummary(tasks) {
  const countEl = document.getElementById("summary-total");
  if (countEl) countEl.textContent = `${tasks.length} tarefas encontradas`;
}
