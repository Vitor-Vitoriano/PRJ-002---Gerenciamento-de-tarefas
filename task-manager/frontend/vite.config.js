import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'pages', // Diz ao Vite para procurar os HTMLs dentro de 'pages'
  // 🔧 CORREÇÃO (Tailwind/JS não carregavam no `npm run dev`):
  // Como o root é 'pages', a pasta de assets ('src') fica FORA da raiz. No dev,
  // o navegador pede /src/css/style.css e /src/js/..., que o Vite não achava
  // (devolvia HTML no lugar do CSS -> Tailwind sem efeito). O alias abaixo faz
  // o dev server resolver qualquer URL /src/* para a pasta real ../src.
  // No build isso é inofensivo (o Rollup já resolve pelos caminhos absolutos).
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../dist', // Joga o site pronto na pasta dist, fora de 'pages'
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'pages/index.html'),
        login: resolve(__dirname, 'pages/login.html'),
        recover: resolve(__dirname, 'pages/recover.html'),
        register: resolve(__dirname, 'pages/register.html'),
      },
    },
  },
});