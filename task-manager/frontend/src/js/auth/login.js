import { showMessage } from "../utils/messages.js";
import { initButtonLock } from "../utils/buttonLock.js";
initButtonLock();

const msgFeedback = document.querySelector("#msg-feedback");

document.querySelector("form").addEventListener("submit", async function(e) { // Adicionado 'async'
  e.preventDefault();

  const email = document.querySelector("input[type='email']").value.trim();
  const password = document.querySelector("input[type='password']").value.trim();

  // Verifica se os campos estão totalmente vazios
  if (!email || !password) {
    showMessage("#msg-feedback", "Preencha todos os campos!", "error");
    return; 
  }

  // Verifica se o formato do e-mail faz sentido
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage("#msg-feedback", "O formato do e-mail é inválido!", "error");
    return;
  }

  try {
    // --- CONEXÃO COM O BACK-END ---
    const response = await fetch("https://taskflow-api-glvv.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        // Se a senha estiver incorreta ou o e-mail não existir, joga para o catch
        throw new Error(data.error || "Erro ao realizar login.");
    }

    // O back-end validou! Guardamos o estado na sessão local do navegador para manter o usuário logado nas páginas
    localStorage.setItem("isLogged", "true");
    localStorage.setItem("usuarioLogado", JSON.stringify(data.usuarioLogado));

    showMessage("#msg-feedback", "Login realizado com sucesso! Entrando...", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);

  } catch (error) {
      // Exibe a mensagem de erro vinda do banco (ex: "E-mail ou senha incorretos!")
      showMessage("#msg-feedback", error.message, "error");
  }
});