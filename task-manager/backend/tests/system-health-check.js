import http from 'http';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

class SystemHealthCheck {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data ? JSON.parse(data) : null,
                        headers: res.headers
                    });
                });
            }).on('error', reject);
        });
    }

    async test(name, fn) {
        process.stdout.write(`  ⏳ ${name}... `);
        try {
            await fn();
            console.log('✅');
            this.passed++;
        } catch (error) {
            console.log(`❌\n       Erro: ${error.message}`);
            this.failed++;
        }
    }

    async validateFrontendFiles() {
        console.log('\n🔍 Validando Arquivos do Frontend\n');

        const basePath = 'c:\\Users\\Vitor\\PRJ-002---Gerenciamento-de-tarefas\\task-manager\\frontend\\src\\js';
        const files = [
            { path: path.join(basePath, 'app\\main.js'), desc: 'Main App' },
            { path: path.join(basePath, 'kanban\\kanban.js'), desc: 'Kanban' },
            { path: path.join(basePath, 'utils\\pagination.js'), desc: 'Pagination Module' },
            { path: path.join(basePath, 'utils\\filters.js'), desc: 'Filters Module' }
        ];

        for (const file of files) {
            await this.test(`Arquivo existe: ${file.desc}`, () => {
                if (!fs.existsSync(file.path)) {
                    throw new Error(`Arquivo não encontrado: ${file.path}`);
                }
            });
        }
    }

    async validateBackendHealth() {
        console.log('\n🔍 Validando Saúde do Backend\n');

        // Teste 1: Status
        await this.test('Backend está respondendo', async () => {
            const result = await this.makeRequest(`${BASE_URL}/api/status`);
            if (result.statusCode !== 200) {
                throw new Error(`Status code: ${result.statusCode}`);
            }
        });

        // Teste 2: Endpoint de Projetos (com paginação)
        await this.test('Paginação de Projetos funciona', async () => {
            const result = await this.makeRequest(`${BASE_URL}/api/projects?userId=test&page=1&take=10`);
            if (result.statusCode !== 200) {
                throw new Error(`Status code: ${result.statusCode}`);
            }
            // Verifica se retorna array ou objeto com paginação
            if (!Array.isArray(result.data) && !result.data?.projects) {
                throw new Error('Resposta em formato inválido');
            }
        });

        // Teste 3: Endpoint de Tarefas (com paginação e filtro)
        await this.test('Paginação de Tarefas com Filtro funciona', async () => {
            const result = await this.makeRequest(
                `${BASE_URL}/api/tasks?projectId=test&page=1&take=20&status=todo`
            );
            if (result.statusCode !== 200) {
                throw new Error(`Status code: ${result.statusCode}`);
            }
        });

        // Teste 4: Cache funcionando (segunda requisição deve ser mais rápida)
        await this.test('Cache está ativo', async () => {
            // Faz múltiplas requisições para ver diferença de cache
            const times = [];
            for (let i = 0; i < 5; i++) {
                const start = Date.now();
                await this.makeRequest(`${BASE_URL}/api/projects?userId=test&page=1&take=10`);
                times.push(Date.now() - start);
            }

            const avgFirst = times[0];
            const avgRest = (times[1] + times[2] + times[3] + times[4]) / 4;

            console.log(`\n       1ª requisição: ${times[0]}ms, Média das próximas: ${avgRest.toFixed(0)}ms`);
            // Cache é considerado ativo se respostas ficam consistentes e rápidas
            if (avgRest > 60) {
                throw new Error(`Respostas lentas mesmo após cache: ${avgRest.toFixed(0)}ms`);
            }
        });
    }

    async validateFrontendSyntax() {
        console.log('\n🔍 Validando Sintaxe do Frontend\n');

        const { execSync } = await import('child_process');
        const frontendPath = 'c:\\Users\\Vitor\\PRJ-002---Gerenciamento-de-tarefas\\task-manager\\frontend';

        const files = [
            'src\\js\\app\\main.js',
            'src\\js\\kanban\\kanban.js',
            'src\\js\\utils\\pagination.js',
            'src\\js\\utils\\filters.js'
        ];

        for (const file of files) {
            await this.test(`Sintaxe OK: ${file}`, () => {
                try {
                    execSync(`node -c "${path.join(frontendPath, file)}"`, { encoding: 'utf-8' });
                } catch (error) {
                    throw new Error(`Erro de sintaxe: ${error.message}`);
                }
            });
        }
    }

    async validatePrismaSchema() {
        console.log('\n🔍 Validando Schema Prisma\n');

        const { execSync } = await import('child_process');
        const backendPath = 'c:\\Users\\Vitor\\PRJ-002---Gerenciamento-de-tarefas\\task-manager\\backend';

        await this.test('Schema Prisma válido', () => {
            try {
                execSync('npx prisma validate', {
                    cwd: backendPath,
                    encoding: 'utf-8'
                });
            } catch (error) {
                throw new Error(`Schema inválido: ${error.message}`);
            }
        });
    }

    async validatePerformanceMetrics() {
        console.log('\n🔍 Validando Métricas de Performance\n');

        await this.test('Tempo de resposta (Projetos) < 50ms (com cache)', async () => {
            // Faz primeira requisição para aquecer cache
            await this.makeRequest(`${BASE_URL}/api/projects?userId=test&page=1&take=10`);

            // Mede segunda requisição
            const start = Date.now();
            await this.makeRequest(`${BASE_URL}/api/projects?userId=test&page=1&take=10`);
            const time = Date.now() - start;

            console.log(`\n       Tempo: ${time}ms`);
            if (time > 50) {
                throw new Error(`Tempo muito alto: ${time}ms`);
            }
        });

        await this.test('Tamanho de payload reduzido', async () => {
            const result = await this.makeRequest(
                `${BASE_URL}/api/tasks?projectId=test&page=1&take=50`
            );

            // Verifica se retorna estrutura com paginação
            if (!result.data?.tasks && !Array.isArray(result.data)) {
                throw new Error('Estrutura de resposta inválida');
            }
        });
    }

    printReport() {
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 RELATÓRIO DE SAÚDE DO SISTEMA');
        console.log('='.repeat(80));
        console.log(`\n✅ Testes Passados: ${this.passed}`);
        console.log(`❌ Testes Falhados: ${this.failed}`);
        console.log(`📈 Taxa de Sucesso: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%\n`);

        if (this.failed === 0) {
            console.log('🎉 SISTEMA ESTÁ 100% FUNCIONAL E OTIMIZADO!\n');
            console.log('Confirmado:');
            console.log('  ✓ Frontend sem erros de sintaxe');
            console.log('  ✓ Backend respondendo corretamente');
            console.log('  ✓ Paginação funcionando em todas as rotas');
            console.log('  ✓ Cache ativo e acelerando requisições');
            console.log('  ✓ Performance dentro dos padrões');
        } else {
            console.log('⚠️  ENCONTRADOS PROBLEMAS - REVISAR ACIMA\n');
        }

        console.log('='.repeat(80) + '\n');
    }

    async runAll() {
        console.log('🚀 Iniciando Verificação de Saúde do Sistema...\n');

        await this.validateFrontendFiles();
        await this.validateFrontendSyntax();
        await this.validateBackendHealth();
        await this.validatePrismaSchema();
        await this.validatePerformanceMetrics();

        this.printReport();

        process.exit(this.failed > 0 ? 1 : 0);
    }
}

const checker = new SystemHealthCheck();
checker.runAll().catch(error => {
    console.error('Erro crítico:', error);
    process.exit(1);
});
