import { searchInput } from "../utils/dom.js";

export function setupSearch() {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();

        // 1. Filtrar no Kanban (cartões)
        const kanbanCards = document.querySelectorAll(".task-card");
        kanbanCards.forEach(card => {
            const title = card.querySelector("h4")?.innerText.toLowerCase() || "";
            const desc = card.querySelector("p")?.innerText.toLowerCase() || "";
            card.style.display = (title.includes(term) || desc.includes(term)) ? "block" : "none";
        });

        // 2. Filtrar no Backlog (linhas da tabela)
        // Como o innerText pega tudo, você pode buscar por título, ID ou responsável!
        const backlogRows = document.querySelectorAll(".task-row-clickable");
        backlogRows.forEach(row => {
            const content = row.innerText.toLowerCase();
            // Usa "" (vazio) em vez de "block" para não quebrar a formatação da tabela
            row.style.display = content.includes(term) ? "" : "none";
        });

        // 3. Filtrar no Dashboard (alertas e pendências)
        const dashboardAlerts = document.querySelectorAll(".alert-card");
        dashboardAlerts.forEach(alert => {
            const content = alert.innerText.toLowerCase();
            alert.style.display = content.includes(term) ? "" : "none";
        });
    });
}