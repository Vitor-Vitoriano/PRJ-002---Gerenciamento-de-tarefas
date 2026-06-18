// src/services/authService.js
import prisma from '../config/prisma.js';

/**
 * Cria um novo utilizador no PostgreSQL
 */
export async function registerUser({ username, email, password }) {
  const userExists = await prisma.user.findUnique({
    where: { email }
  });

  if (userExists) {
    throw new Error('Este e-mail já está cadastrado!');
  }

  // 🔧 RBAC (regra crítica de segurança): o cadastro público SEMPRE cria MEMBER.
  // Qualquer "role" enviada no corpo da requisição é deliberadamente ignorada.
  // A promoção para MANAGER/ADMIN só ocorre por um ADMIN dentro do sistema.
  const newUser = await prisma.user.create({
    data: {
      name: username,
      email,
      password,
      role: 'MEMBER'
    }
  });

  return newUser;
}

/**
 * Valida o login do utilizador no PostgreSQL
 */
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.password !== password) {
    throw new Error('E-mail ou senha incorretos!');
  }

  return user;
}