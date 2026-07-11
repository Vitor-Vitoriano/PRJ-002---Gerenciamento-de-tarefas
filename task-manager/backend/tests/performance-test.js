import http from 'http';

const BASE_URL = 'http://localhost:3000';

class PerformanceTester {
    constructor() {
        this.results = [];
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const startHrTime = process.hrtime();

            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    const hrTime = process.hrtime(startHrTime);
                    const timeMs = hrTime[0] * 1000 + hrTime[1] / 1000000;
                    const sizeKb = Buffer.byteLength(data) / 1024;

                    resolve({
                        statusCode: res.statusCode,
                        timeMs,
                        sizeKb,
                        headers: res.headers,
                        data: JSON.parse(data)
                    });
                });
            }).on('error', reject);
        });
    }

    async runTest(name, url, iterations = 10) {
        console.log(`\n📊 Testando: ${name}`);
        console.log(`URL: ${url}`);
        console.log(`Iterações: ${iterations}\n`);

        const times = [];
        const sizes = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const result = await this.makeRequest(url);
                times.push(result.timeMs);
                sizes.push(result.sizeKb);

                console.log(`  ✓ Iteração ${i + 1}: ${result.timeMs.toFixed(2)}ms | ${result.sizeKb.toFixed(2)}KB`);
            } catch (error) {
                console.error(`  ✗ Iteração ${i + 1}: ${error.message}`);
                return null;
            }
        }

        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const avgSize = sizes.reduce((a, b) => a + b) / sizes.length;

        const result = {
            name,
            url,
            iterations,
            avgTime: avgTime.toFixed(2),
            minTime: minTime.toFixed(2),
            maxTime: maxTime.toFixed(2),
            avgSize: avgSize.toFixed(2)
        };

        this.results.push(result);
        return result;
    }

    async runLoadTest(name, url, concurrentRequests = 10, totalRequests = 100) {
        console.log(`\n🔥 Teste de Carga: ${name}`);
        console.log(`URL: ${url}`);
        console.log(`Requisições Simultâneas: ${concurrentRequests} | Total: ${totalRequests}\n`);

        const times = [];
        let completed = 0;
        let failed = 0;

        const chunk = Math.ceil(totalRequests / concurrentRequests);

        for (let batch = 0; batch < chunk; batch++) {
            const batchSize = Math.min(concurrentRequests, totalRequests - batch * concurrentRequests);
            const promises = [];

            for (let i = 0; i < batchSize; i++) {
                promises.push(
                    this.makeRequest(url)
                        .then(result => {
                            times.push(result.timeMs);
                            completed++;
                        })
                        .catch(() => {
                            failed++;
                        })
                );
            }

            await Promise.all(promises);
            console.log(`  ✓ Lote ${batch + 1}: ${completed}/${totalRequests} requisições completadas`);
        }

        const avgTime = times.length > 0 ? times.reduce((a, b) => a + b) / times.length : 0;
        const minTime = times.length > 0 ? Math.min(...times) : 0;
        const maxTime = times.length > 0 ? Math.max(...times) : 0;
        const throughput = completed / (times.reduce((a, b) => a + b) / 1000);

        const result = {
            name,
            url,
            completed,
            failed,
            avgTime: avgTime.toFixed(2),
            minTime: minTime.toFixed(2),
            maxTime: maxTime.toFixed(2),
            throughput: throughput.toFixed(2)
        };

        this.results.push(result);
        return result;
    }

    printReport() {
        console.log('\n\n' + '='.repeat(80));
        console.log('📈 RELATÓRIO DE PERFORMANCE');
        console.log('='.repeat(80) + '\n');

        console.table(this.results);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Teste concluído em: ' + new Date().toLocaleString());
        console.log('='.repeat(80) + '\n');
    }
}

async function main() {
    const tester = new PerformanceTester();

    console.log('🚀 Iniciando testes de performance...\n');

    // Teste 1: Endpoint de status (baseline rápido)
    await tester.runTest('Status Endpoint (Baseline)', `${BASE_URL}/api/status`, 5);

    // Teste 2: Listagem de projetos sem paginação
    await tester.runTest('Projetos (Sem Paginação)', `${BASE_URL}/api/projects?userId=test`, 5);

    // Teste 3: Listagem de projetos com paginação
    await tester.runTest('Projetos (Com Paginação)', `${BASE_URL}/api/projects?userId=test&page=1&take=10`, 5);

    // Teste 4: Listagem de tarefas
    await tester.runTest('Tarefas (Sem Paginação)', `${BASE_URL}/api/tasks?projectId=test`, 5);

    // Teste 5: Listagem de tarefas com paginação e filtro
    await tester.runTest('Tarefas (Com Paginação e Filtro)', `${BASE_URL}/api/tasks?projectId=test&page=1&take=20&status=todo`, 5);

    // Teste 6: Teste de carga no endpoint de projetos
    await tester.runLoadTest('Carga - Projetos', `${BASE_URL}/api/projects?userId=test`, 5, 50);

    // Teste 7: Teste de carga no endpoint de tarefas
    await tester.runLoadTest('Carga - Tarefas', `${BASE_URL}/api/tasks?projectId=test&page=1&take=10`, 5, 50);

    // Imprimir relatório
    tester.printReport();

    process.exit(0);
}

main().catch(error => {
    console.error('Erro ao executar testes:', error);
    process.exit(1);
});
