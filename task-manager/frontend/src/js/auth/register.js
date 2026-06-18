import { showMessage } from "../utils/messages.js";
import { initButtonLock } from "../utils/buttonLock.js";
initButtonLock();

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    if (!form) {
        console.error("Formulário não encontrado!");
        return;
    }

    form.addEventListener("submit", async function(event) { // Adicionado 'async'
        event.preventDefault();

        const username = form.querySelector("input[type='text']").value.trim();
        const email = form.querySelector("input[type='email']").value.trim();
        const password = form.querySelector("input[type='password']").value.trim();
        // 🔧 RBAC: o cadastro público NÃO envia mais role. O backend força MEMBER.

        if (!username || !email || !password) {
            showMessage("#msg-feedback", "Preencha todos os campos!", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage("#msg-feedback", "Por favor, insira um e-mail válido!", "error");
            return;
        }

        try {
            // --- CONEXÃO COM O BACK-END ---
            const response = await fetch("https://taskflow-api-glvv.onrender.com/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Se o back-end retornar um erro (ex: e-mail já cadastrado), joga para o catch
                throw new Error(data.error || "Erro ao criar conta.");
            }

            // Sucesso retornado do PostgreSQL
            showMessage("#msg-feedback", "Sucesso! Criando sua conta...", "success");

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } catch (error) {
            // Exibe o erro real vindo do banco de dados (PostgreSQL) na tela
            showMessage("#msg-feedback", error.message, "error");
        }
    });
});