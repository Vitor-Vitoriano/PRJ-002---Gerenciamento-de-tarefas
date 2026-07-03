# 📊 TaskFlow - Sistema de Gerenciamento de Sprints e Tarefas

> Uma plataforma ágil e intuitiva para otimização de fluxos de trabalho e acompanhamento de projetos.

---
## 🎯 Objetivo do Projeto

O **TaskFlow** nasceu da necessidade de equipes que buscam uma gestão visual simplificada, porém robusta, para suas rotinas de desenvolvimento e sprints. O sistema centraliza a distribuição de tarefas, acompanhamento de progresso e análise de dados em tempo real, permitindo que gerentes e membros colaborem de forma assíncrona com transparência e eficiência.

---

## 💻 Funcionalidades Principais

*   **Gestão de Múltiplos Projetos:** Criação, edição e controle de escopo baseados nas permissões de cada usuário.
*   **Workspace Kanban Integrado:** Interface dinâmica e interativa para movimentação e acompanhamento do ciclo de vida das tarefas.
*   **Painel Backlog:** Organização e priorização detalhada do estoque de tarefas antes de entrarem nas sprints operacionais.
*   **Dashboard Executivo:** Métricas gerenciais calculadas em tempo real com gráficos de performance por equipe e projeto.
*   **Relatórios e Auditoria:** Tabela avançada de busca com filtros combinados (status, responsável, data) e funcionalidade de **Exportação para PDF e Excel**.

---

## 🖼️ Demonstração do Sistema (Telas)

### 📈 Dashboard
![Dashboard](image_d1d3fd.png)
*Painel estatístico centralizado com a saúde global do workspace.*

### 📋 Quadro Kanban
![Kanban](image_9c4e4d.png)
*Gestão ágil visual com cards dinâmicos e distribuição por colunas.*

### 🗃️ Painel de Backlog
![Backlog](NOME_DA_SUA_IMAGEM_DO_BACKLOG.png)
*Área de planejamento e priorização do estoque de tarefas antes de irem para a sprint.*

### 📊 Relatórios Avançados
![Relatórios](image_9c4df0.png)
*Módulo de exportação, auditoria e filtros dinâmicos de tarefas.*

---

## 🛠️ Tecnologias Utilizadas

### Front-end
*   **HTML5 & CSS3:** Estruturação semântica e customizações finas de interface.
*   **Tailwind CSS:** Framework utilitário para design responsivo e moderno.
*   **JavaScript (ES6+):** Lógica dinâmica cliente-side, manipulação do DOM e integrações assíncronas com APIs.

### Back-end & Banco de Dados
*   **Node.js & Express:** Ambiente de execução e framework para construção da API RESTful de alta performance.
*   **Prisma ORM:** Abstração e gerenciamento resiliente das tabelas do banco de dados através de queries otimizadas (`JOINs`).
*   **PostgreSQL (Supabase):** Banco de dados relacional robusto integrado para controle transacional estável.
*   **JWT (JSON Web Tokens):** Segurança e autenticação baseada em rotas protegidas por nível de acesso (Roles).

### Hospedagem & Deploy
*   **Render:** Plataforma Cloud utilizada para o deploy contínuo (CI/CD) do Front-end e da API REST.

---

## 👥 Integrantes e Contato

| Nome | Função no Projeto | GitHub | LinkedIn | E-mail |
| :--- | :--- | :--- | :--- | :--- |
| **Vitor Vitoriano** | Full-Stack Developer | [@Vitor-Vitoriano](https://github.com/Vitor-Vitoriano) | [LinkedIn](https://www.linkedin.com/in/vitor-vitoriano-20921b327/) | [vtndigitalx@gmail.com](mailto:vtndigitalx@gmail.com) |

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos
* Node.js instalado (versão 18 ou superior).
* Uma instância ativa do PostgreSQL (pode utilizar o Supabase).

1-Instale as dependências:

Bash
npm install
Configure as variáveis de ambiente (arquivo .env) para o seu banco de dados via Prisma.

1.2- Rode as migrações do banco de dados:

Bash
npx prisma migrate dev
1.3- Inicie o servidor de desenvolvimento:

Bash
npm run dev
2. Configuração do Frontend (Web):
2.1 Abra um novo terminal e navegue até a pasta do frontend:

Bash
cd frontend
2.2 Instale as dependências:

Bash
npm install
2.3 Inicie o servidor de desenvolvimento com o Vite:

Bash
npm run dev
👩‍💻 Benefícios do Projeto :
Organização Visual: Divisão clara de tarefas pendentes, em andamento e concluídas através de um sistema Kanban interativo.

Produtividade Aumentada: Interface fluida que permite priorizar e atualizar o status das tarefas num piscar de olhos.

Relatórios Rápidos: Exportação instantânea de listas de tarefas para formatos Excel e PDF para auditoria ou arquivamento.

Experiência Limpa: Alertas interativos e amigáveis para confirmação de ações críticas do usuário.

📞 Contato
Para mais informações ou para colaborar com o projeto, entre em contato com os desenvolvedores através dos perfis do GitHub. 
