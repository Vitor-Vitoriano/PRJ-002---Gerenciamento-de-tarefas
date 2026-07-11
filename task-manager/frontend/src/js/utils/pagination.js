/**
 * Módulo de Paginação para Frontend
 * Gerencia carregamento lazy de tarefas, projetos e sprints
 */

class PaginationManager {
    constructor() {
        this.caches = {};
    }

    /**
     * Carrega próxima página de um recurso
     * @param {string} resourceType - 'tasks', 'projects', 'sprints'
     * @param {string} filterId - projectId, userId, etc.
     * @returns {Promise<Array>}
     */
    async loadNextPage(resourceType, filterId) {
        const cacheKey = `${resourceType}:${filterId}`;
        const paginationKey = `${cacheKey}:pagination`;

        // Recupera estado de paginação do localStorage
        let state = JSON.parse(localStorage.getItem(paginationKey) || '{"page": 1, "take": 50, "total": 0}');

        // Carrega próxima página
        state.page++;
        const newItems = await this._fetchPage(resourceType, filterId, state.page, state.take);

        // Atualiza localStorage
        localStorage.setItem(paginationKey, JSON.stringify(state));

        return newItems;
    }

    /**
     * Busca uma página específica
     */
    async _fetchPage(resourceType, filterId, page, take) {
        let url = '';

        switch (resourceType) {
            case 'tasks':
                url = `https://taskflow-api-glvv.onrender.com/api/tasks?projectId=${filterId}&page=${page}&take=${take}`;
                break;
            case 'projects':
                url = `https://taskflow-api-glvv.onrender.com/api/projects?userId=${filterId}&page=${page}&take=${take}`;
                break;
            case 'sprints':
                url = `https://taskflow-api-glvv.onrender.com/api/sprints?projectId=${filterId}&page=${page}&take=${take}`;
                break;
            default:
                throw new Error('Tipo de recurso inválido');
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Suporta ambos formatos: array ou objeto com paginação
            return Array.isArray(data) ? data : (data[resourceType] || data.items || []);
        } catch (error) {
            console.error(`Erro ao carregar ${resourceType}:`, error);
            return [];
        }
    }

    /**
     * Verifica se há mais itens a carregar
     */
    hasMore(resourceType, filterId) {
        const paginationKey = `${resourceType}:${filterId}:pagination`;
        const state = JSON.parse(localStorage.getItem(paginationKey) || '{"page": 1, "take": 50, "total": 0}');

        return (state.page * state.take) < state.total;
    }

    /**
     * Reseta estado de paginação
     */
    reset(resourceType, filterId) {
        const paginationKey = `${resourceType}:${filterId}:pagination`;
        localStorage.removeItem(paginationKey);
    }
}

export const paginationManager = new PaginationManager();

/**
 * Setup scroll infinito em um container
 * Carrega mais itens automaticamente quando atinge o fim
 */
export function setupInfiniteScroll(containerId, resourceType, filterId, renderCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let isLoading = false;

    const handleScroll = async () => {
        const { scrollHeight, scrollTop, clientHeight } = container;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (atBottom && !isLoading && paginationManager.hasMore(resourceType, filterId)) {
            isLoading = true;

            try {
                const newItems = await paginationManager.loadNextPage(resourceType, filterId);
                if (renderCallback) {
                    renderCallback(newItems);
                }
            } catch (error) {
                console.error('Erro ao carregar mais itens:', error);
            } finally {
                isLoading = false;
            }
        }
    };

    container.addEventListener('scroll', handleScroll);
}

/**
 * Setup carregamento manual com botão
 */
export function setupLoadMoreButton(buttonId, resourceType, filterId, renderCallback) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Carregando...';

        try {
            const newItems = await paginationManager.loadNextPage(resourceType, filterId);
            if (renderCallback) {
                renderCallback(newItems);
            }

            if (!paginationManager.hasMore(resourceType, filterId)) {
                button.textContent = 'Tudo carregado';
                button.style.display = 'none';
            } else {
                button.textContent = 'Carregar mais';
                button.disabled = false;
            }
        } catch (error) {
            console.error('Erro ao carregar mais itens:', error);
            button.textContent = 'Tentar novamente';
            button.disabled = false;
        }
    });
}
