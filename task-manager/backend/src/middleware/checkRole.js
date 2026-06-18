// src/middleware/checkRole.js
// 🔧 RBAC Fase 4 — Middleware de autorização por papel.
//
// Observação importante: o projeto NÃO usa JWT. Portanto, este middleware
// identifica o solicitante pelo `userId` que o front-end envia (body ou query)
// e busca a role real no banco. É uma defesa de servidor adicional ao gating
// de interface — mas, sem token assinado, o userId é "confiável por convenção".
// Para segurança forte de verdade, o passo futuro seria adotar JWT.
import prisma from "../config/prisma.js";

export function checkRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = (req.body && req.body.userId) || (req.query && req.query.userId);

      if (!userId) {
        return res.status(401).json({ error: "Usuário não identificado na requisição." });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        return res.status(401).json({ error: "Usuário inválido." });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Acesso negado: seu perfil não tem permissão para esta ação." });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Erro na verificação de permissão: " + error.message });
    }
  };
}
