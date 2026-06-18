// 🔧 CORREÇÃO: reutiliza a ÚNICA instância de PrismaClient (config/prisma.js).
// Antes este arquivo criava `new PrismaClient()` próprio, abrindo um segundo
// pool de conexões — o que dobra as conexões com o Supabase e agrava o erro
// "prepared statement does not exist" do pooler. Agora há um só client.
import prisma from "../config/prisma.js";

// =========================================================================
// FUNÇÃO AUXILIAR DE SEGURANÇA (Garante que nunca quebre se não achar usuário)
// =========================================================================
const getValidUserId = async (userId, projectId) => {
    let cleanId = null;
    
    if (userId && userId !== "undefined" && userId !== "[object Object]") {
        cleanId = userId;
    } else if (projectId && projectId !== "undefined" && projectId !== "[object Object]") {
        cleanId = projectId;
    }

    if (cleanId) {
        const userExists = await prisma.user.findUnique({ where: { id: cleanId } });
        if (userExists) return cleanId;

        const projectOwner = await prisma.project.findUnique({
            where: { id: cleanId },
            select: { ownerId: true }
        });
        if (projectOwner?.ownerId) return projectOwner.ownerId;
    }

    const fallbackUser = await prisma.user.findFirst();
    if (fallbackUser) return fallbackUser.id;

    return null;
};

// 🔧 RBAC Fase 2 — converte uma lista de IDs de usuário (vinda do front) nos
// e-mails correspondentes, que é a chave usada pela tabela ProjectMember.
// Remove duplicados e ignora o próprio dono (ele já enxerga via ownerId).
const resolveMemberEmails = async (memberIds, ownerId = null) => {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return [];

    const ids = memberIds.filter(id => id && id !== ownerId);
    if (ids.length === 0) return [];

    const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { email: true }
    });

    // dedupe por e-mail
    return [...new Set(users.map(u => u.email))];
};

// ==========================================
// CONTROLLER DE USUÁRIOS
// ==========================================
export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true, 
                email: true
            },
            orderBy: { name: 'asc' }
        });
        // Retorna a lista encontrada
        return res.status(200).json(users);
    } catch (error) {
        console.error("Erro ao listar usuários no banco:", error.message);
        return res.status(200).json([]); 
    }
};

// ==========================================
// CONTROLLERS DE PROJETOS (ATUALIZADOS)
// ==========================================
export const createProject = async (req, res) => {
    try {
        // 🌟 Captura também o array de IDs dos membros vinculados vindo do Front-end
        const { name, userId, memberIds } = req.body;
        const targetUserId = await getValidUserId(userId, null);

        if (!targetUserId) {
            return res.status(400).json({ error: "Crie ao menos um usuário no sistema antes de criar projetos." });
        }

        // 🔧 RBAC Fase 2: grava os membros vinculados na tabela ProjectMember.
        // O front envia IDs de usuário; a tabela é chaveada por e-mail, então
        // resolvemos os IDs para e-mails antes de criar os vínculos.
        const memberEmails = await resolveMemberEmails(memberIds, targetUserId);

        const project = await prisma.project.create({
            data: {
                name,
                owner: { connect: { id: targetUserId } },
                members: memberEmails.length > 0
                    ? { create: memberEmails.map(email => ({ userEmail: email })) }
                    : undefined
            }
        });
        return res.status(201).json(project);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar projeto: " + error.message });
    }
};

export const getProjectsByUser = async (req, res) => {
    try {
        // 🔧 RBAC Fase 1 — Isolamento por papel.
        // Sem JWT: o front envia o userId e o backend descobre a role/email do
        // solicitante no banco para decidir o que ele pode ver:
        //   ADMIN   -> todos os projetos
        //   MANAGER -> apenas os projetos que ele criou (ownerId)
        //   MEMBER  -> apenas os projetos em que foi vinculado (ProjectMember)
        const { userId } = req.query;

        if (!userId || userId === "undefined" || userId === "[object Object]") {
            return res.status(200).json([]);
        }

        const requester = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true }
        });

        // Solicitante inválido => nada a exibir (não cai mais em fallback que vazava dados)
        if (!requester) return res.status(200).json([]);

        let where;
        if (requester.role === 'ADMIN') {
            where = {};
        } else if (requester.role === 'MANAGER') {
            where = { ownerId: requester.id };
        } else {
            // MEMBER: projetos onde o e-mail dele consta como membro vinculado
            where = { members: { some: { userEmail: requester.email } } };
        }

        const projects = await prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(projects);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao buscar projetos: " + error.message });
    }
};

// 🌟 NOVO: Atualizar/Editar Configurações do Projeto
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, memberIds } = req.body;

        // 🔧 RBAC Fase 2: se vier a lista de membros, sincroniza os vínculos.
        // Estratégia simples e previsível: apaga os vínculos atuais e recria a
        // lista enviada (set completo), resolvendo IDs -> e-mails.
        let membersData;
        if (Array.isArray(memberIds)) {
            const projeto = await prisma.project.findUnique({
                where: { id },
                select: { ownerId: true }
            });
            const memberEmails = await resolveMemberEmails(memberIds, projeto?.ownerId);
            membersData = {
                deleteMany: {},
                create: memberEmails.map(email => ({ userEmail: email }))
            };
        }

        const updatedProject = await prisma.project.update({
            where: { id: id },
            data: {
                ...(name && { name }),
                ...(membersData ? { members: membersData } : {})
            }
        });

        return res.status(200).json(updatedProject);
    } catch (error) {
        console.error("Erro ao editar projeto no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao atualizar projeto: " + error.message });
    }
};

// 🌟 NOVO: Deletar Projeto de forma segura limpando dependências (Cascata manual)
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Apaga todas as tarefas vinculadas a esse projeto primeiro
        await prisma.task.deleteMany({
            where: { projectId: id }
        });

        // 2. Apaga todas as Sprints vinculadas a esse projeto
        // 🔧 CORREÇÃO: antes apagava por { userId: id } (id é o projeto, não o usuário),
        // então nunca removia as sprints corretas. Agora filtra pelo projectId.
        await prisma.sprint.deleteMany({
            where: { projectId: id }
        });

        // 3. Por fim, deleta o projeto
        await prisma.project.delete({
            where: { id: id }
        });

        return res.status(200).json({ message: "Projeto e todas as suas dependências foram excluídos com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar projeto no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao excluir projeto: " + error.message });
    }
};

// ==========================================
// CONTROLLERS DE SPRINTS
// ==========================================
export const getSprintsByProject = async (req, res) => {
    try {
        // 🔧 CORREÇÃO (conflito front x back):
        // O front-end envia "?projectId=...", mas aqui antes líamos "?userId".
        // Como userId vinha "undefined", o filtro ficava vazio e o Prisma
        // RETORNAVA TODAS AS SPRINTS DE TODAS AS CONTAS (sprints de outras
        // contas apareciam e a tela nunca começava zerada).
        //
        // Agora a Sprint tem projectId próprio, então filtramos diretamente
        // pelo projeto enviado pelo front-end. Conta/projeto novo começa zerado.
        const { projectId } = req.query;

        // Sem projeto válido => nada a exibir (não vaza sprint de outros projetos)
        if (!projectId || projectId === "undefined" || projectId === "[object Object]") {
            return res.status(200).json([]);
        }

        const sprints = await prisma.sprint.findMany({
            where: { projectId: projectId },
            orderBy: { createdAt: 'asc' }
        });

        return res.status(200).json(sprints);
    } catch (error) {
        console.error("Erro ao buscar sprints:", error.message);
        return res.status(200).json([]);
    }
};

export const createSprint = async (req, res) => {
    try {
        const { name, title, startDate, endDate, userId, projectId } = req.body;
        const targetUserId = await getValidUserId(userId, projectId);

        const newSprint = await prisma.sprint.create({
            data: {
                name: name || title || "Nova Sprint",
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : new Date(),
                status: "A FAZER",
                userId: targetUserId,
                // 🔧 CORREÇÃO: vincula a sprint ao projeto que o front-end enviou,
                // para que cada projeto tenha as suas próprias sprints.
                // Usa o escalar projectId (e não project:{connect}) porque userId
                // acima já é escalar — o Prisma não permite misturar os dois estilos.
                ...(projectId ? { projectId: projectId } : {})
            }
        });
        return res.status(201).json(newSprint);
    } catch (error) {
        console.error("Erro ao criar sprint no Prisma:", error.message);
        return res.status(500).json({ error: "Erro interno ao salvar sprint: " + error.message });
    }
};

export const updateSprint = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, status } = req.body;

        const updatedSprint = await prisma.sprint.update({
            where: { id: id },
            data: {
                ...(name && { name }),
                ...(status && { status }),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        });

        return res.status(200).json(updatedSprint);
    } catch (error) {
        console.error("Erro ao editar sprint no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao atualizar sprint: " + error.message });
    }
};

// ==========================================
// CONTROLLERS DE TAREFAS
// ==========================================
export const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, endDate, dueDate, sprintId, projectId, userId, responsible } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: "Não é possível criar uma tarefa sem um projectId válido." });
        }
        if (!sprintId) {
            return res.status(400).json({ error: "Não é possível criar uma tarefa sem vincular a uma Sprint." });
        }

        let targetUserId = null;
        let assignedUserId = null; // 🔧 RBAC F3: a quem a tarefa será atribuída
        if (responsible && responsible !== "Selecione um membro...") {
            const chosenUser = await prisma.user.findFirst({
                where: { name: responsible }
            });
            if (chosenUser) {
                targetUserId = chosenUser.id;
                assignedUserId = chosenUser.id;
            }
        }
        if (!targetUserId) {
            targetUserId = await getValidUserId(userId, projectId);
        }

        if (!targetUserId) {
            return res.status(400).json({ error: "Crie ao menos um usuário no sistema para criar tarefas." });
        }

        let finalDueDate = null;
        const rawDate = dueDate || endDate;
        if (rawDate) {
            finalDueDate = new Date(rawDate).toISOString().split('T')[0];
        }

        const taskStatus = status || "todo";

        const newTask = await prisma.task.create({
            data: {
                title: title || "Nova Tarefa",
                desc: description || "", 
                status: taskStatus,
                column: taskStatus, 
                priority: priority || "medium",
                responsible: responsible && responsible !== "Selecione um membro..." ? responsible : "Não atribuído",
                dueDate: finalDueDate,
                inSprint: true, 
                completedInSprint: false,
                progress: 0,
                project: {
                    connect: { id: projectId }
                },
                sprint: {
                    connect: { id: sprintId }
                },
                user: {
                    connect: { id: targetUserId }
                },
                // 🔧 RBAC F3: responsável atual e autor da última alteração (na criação, o criador).
                ...(assignedUserId ? { assignedTo: { connect: { id: assignedUserId } } } : {}),
                updatedBy: { connect: { id: targetUserId } }
            }
        });

        return res.status(201).json(newTask);
    } catch (error) {
        console.error("Erro definitivo ao criar tarefa no Prisma:", error.message);
        return res.status(500).json({ error: "Erro interno ao criar tarefa: " + error.message });
    }
};

export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.query;

        if (!projectId || projectId === "undefined" || projectId === "[object Object]") {
            return res.status(200).json([]);
        }

        const tasks = await prisma.task.findMany({
            where: {
                projectId: projectId
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json(tasks);
    } catch (error) {
        console.error("Erro ao buscar tarefas:", error.message);
        return res.status(200).json([]);
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        // 🔧 RBAC F3: actorId = quem está fazendo a alteração (opcional, enviado pelo front).
        const { title, description, status, priority, responsible, startDate, endDate, dueDate, actorId } = req.body;

        // Resolve o responsável (nome) para o id do usuário atribuído, quando aplicável.
        let assignedToUserId;
        if (responsible && responsible !== "Selecione um membro..." && responsible !== "Não atribuído") {
            const chosen = await prisma.user.findFirst({ where: { name: responsible }, select: { id: true } });
            if (chosen) assignedToUserId = chosen.id;
        }

        let finalDueDate = undefined;
        const rawDate = dueDate || endDate;
        if (rawDate) {
            finalDueDate = new Date(rawDate).toISOString().split('T')[0];
        }

        // 🔍 CAPTURA INTELIGENTE DE DATAS DO FLUXO (Sem alterar o banco de dados)
        let trackingData = {};
        if (status) {
            const cleanStatus = status.toLowerCase().trim();
            if (cleanStatus === "doing" || cleanStatus === "em andamento") {
                // Quando entra em execução, marca o início
                trackingData.createdAt = new Date(); 
            } else if (cleanStatus === "done" || cleanStatus === "concluido" || cleanStatus === "concluída") {
                // Quando termina, grava a conclusão usando o updatedAt nativo
                trackingData.updatedAt = new Date();
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id: id },
            data: {
                ...(title && { title }),
                ...(description && { desc: description }), 
                ...(status && { status, column: status }),
                ...(priority && { priority }),
                ...(responsible && { responsible }), 
                ...(startDate && { startDate: new Date(startDate) }),
                ...(finalDueDate && { dueDate: finalDueDate }),
                // 🔧 RBAC F3: atualiza o responsável e quem fez a última alteração
                ...(assignedToUserId ? { assignedToUserId } : {}),
                ...(actorId ? { updatedByUserId: actorId } : {}),
                ...trackingData // Injeta os carimbos de tempo sem quebrar o schema
            }
        });
        return res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Erro ao editar tarefa no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao atualizar tarefa: " + error.message });
    }
};

export const deleteSprint = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.task.deleteMany({
            where: { sprintId: id }
        });

        await prisma.sprint.delete({
            where: { id: id }
        });

        return res.status(200).json({ message: "Sprint e suas tarefas foram excluídas com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar sprint no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao excluir sprint: " + error.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.task.delete({
            where: { id: id }
        });

        return res.status(200).json({ message: "Tarefa excluída com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar tarefa no Prisma:", error.message);
        return res.status(500).json({ error: "Erro ao excluir tarefa: " + error.message });
    }
};