
import { renderBacklogPage } from "../backlog/backlog.page.js";
import { initDashboardMetrics } from "../dashboard/dashboard.js";
import { initReports, reloadReports } from "../reports/reports.js";

document.addEventListener("DOMContentLoaded", () => {

    const navButtons = document.querySelectorAll(".nav-btn");

    const views = {
        "btn-dashboard": {
            element: document.getElementById("view-dashboard"),
            title: "Dashboard Geral"
        },
        "btn-kanban": {
            element: document.getElementById("view-kanban"),
            title: "Sprint Kanban"
        },
        "btn-backlog": {
            element: document.getElementById("view-backlog"),
            title: "Backlog de Produto"
        },
        "btn-reports": {
            element: document.getElementById("view-reports"),
            title: "Relatórios"
        }
    };

    const pageTitle = document.getElementById("current-page-title");

    let reportsInitialized = false;

    navButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            const target = btn.id;

            // 🔧 RBAC Fase 4 — Proteção de rota (defesa em profundidade).
            // Mesmo que um MEMBER reexiba um botão restrito, a navegação é bloqueada.
            let role = "MEMBER";
            let isProjectManager = false;
            try {
                const u = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
                const currentProject = JSON.parse(localStorage.getItem("currentProject") || "{}");
                role = String(u.role || "MEMBER").toUpperCase();
                isProjectManager = currentProject.ownerId === u.id;
            } catch (_) { /* mantém MEMBER por segurança */ }

            const viewsRestritas = ["btn-dashboard", "btn-backlog", "btn-reports"];
            if (role === "MEMBER" && !isProjectManager && viewsRestritas.includes(target)) {
                console.warn("Acesso negado: este recurso é restrito ao seu perfil.");
                return;
            }

            // ── Resetar botões ──
            navButtons.forEach(b => {
                b.classList.remove("bg-blue-50","text-blue-600","border-l-4","border-blue-600","font-bold","shadow-sm");
                b.classList.add("text-slate-500","font-semibold");
            });

            // ── Botão ativo ──
            btn.classList.add("bg-blue-50","text-blue-600","border-l-4","border-blue-600","font-bold","shadow-sm");
            btn.classList.remove("text-slate-500","font-semibold");

            // ── Esconder todas as views ──
            Object.values(views).forEach(view => {
                if (view.element) {
                    view.element.classList.add("hidden");
                    view.element.classList.remove("flex");
                }
            });

            // ── Mostrar view selecionada ──
            const selectedView = views[target];
            if (selectedView && selectedView.element) {
                if (target === "btn-reports") {
                    selectedView.element.classList.remove("hidden");
                    selectedView.element.classList.add("flex");
                } else {
                    selectedView.element.classList.remove("hidden");
                }
                if (pageTitle) pageTitle.innerText = selectedView.title;

                if (target === "btn-dashboard") {
                    initDashboardMetrics();
                }

                if (target === "btn-reports") {
                    if (!reportsInitialized) {
                        // Primeira abertura: registra listeners e carrega dados
                        initReports();
                        // Observer para contador de linhas
                        const observer = new MutationObserver(() => {
                            const rows = document.querySelectorAll("#report-tbody tr").length;
                            const label = document.getElementById("summary-count-label");
                            if (label) {
                                label.textContent = rows > 0
                                    ? `${rows} tarefa${rows !== 1 ? "s" : ""} encontrada${rows !== 1 ? "s" : ""}`
                                    : "";
                            }
                        });
                        const tbody = document.getElementById("report-tbody");
                        if (tbody) observer.observe(tbody, { childList: true });
                        reportsInitialized = true;
                    } else {
                        // Visitas seguintes: apenas recarrega dados frescos sem re-registrar listeners
                        reloadReports();
                    }
                }
            }

            // ── Render Backlog ──
            if (target === "btn-backlog") {
                renderBacklogPage();
            }
        });
    });
});
