/**
 * src/js/reports/reports.main.js
 * Entry-point da página dedicada de Relatórios (reports.html) e inicializador de ciclo de vida.
 */
import { checkAuth, initUserUI } from "../auth/session.js";
import { initReports } from "./reports.js";

const isReportsPage = window.location.pathname.endsWith("reports.html");

if (isReportsPage) {
  const user = checkAuth();

  if (user) {
    const role = String(user.role || "").toUpperCase();
    const currentProject = JSON.parse(localStorage.getItem("currentProject") || "{}");
    const hasReportsAccess = role === "ADMIN" || role === "MANAGER" || currentProject.ownerId === user.id;

    if (!hasReportsAccess) {
      window.location.href = "403.html";
    } else {
      initUserUI(user);
      initReports();

      // Monitora e atualiza dinamicamente a label de contagem de linhas injetadas
      const observer = new MutationObserver(() => {
        const rows = document.querySelectorAll("#report-tbody tr").length;
        const label = document.getElementById("summary-count-label");
        if (label) {
          label.textContent = rows > 0 ? `${rows} tarefa${rows !== 1 ? "s" : ""} encontrada${rows !== 1 ? "s" : ""}` : "";
        }
      });
      
      const tbody = document.getElementById("report-tbody");
      if (tbody) observer.observe(tbody, { childList: true });
    }
  }
}
