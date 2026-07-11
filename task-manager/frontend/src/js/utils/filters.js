/**
 * Módulo de Filtros de Tarefas para Kanban
 * Filtra tarefas por status sem precisar recarregar tudo do banco
 */

import { paginationManager } from './pagination.js';

class TaskFilterManager {
    constructor() {
        this.activeFilters = {
            status: null,
            priority: null,
            assignedTo: null
        };
        this.filterChangeCallbacks = [];
    }

    /**
     * Aplica filtro por status
     */
    setStatusFilter(status) {
        this.activeFilters.status = status;
        this._notifyListeners();
    }

    /**
     * Aplica filtro por prioridade
     */
    setPriorityFilter(priority) {
        this.activeFilters.priority = priority;
        this._notifyListeners();
    }

    /**
     * Aplica filtro por responsável
     */
    setAssignedFilter(assignedTo) {
        this.activeFilters.assignedTo = assignedTo;
        this._notifyListeners();
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters() {
        this.activeFilters = { status: null, priority: null, assignedTo: null };
        this._notifyListeners();
    }

    /**
     * Filtra um array de tarefas com base nos filtros ativos
     */
    filterTasks(tasks) {
        return tasks.filter(task => {
            if (this.activeFilters.status && task.status !== this.activeFilters.status) {
                return false;
            }
            if (this.activeFilters.priority && task.priority !== this.activeFilters.priority) {
                return false;
            }
            if (this.activeFilters.assignedTo && task.responsible !== this.activeFilters.assignedTo) {
                return false;
            }
            return true;
        });
    }

    /**
     * Registra callback que é chamado quando filtros mudam
     */
    onChange(callback) {
        this.filterChangeCallbacks.push(callback);
    }

    _notifyListeners() {
        this.filterChangeCallbacks.forEach(cb => cb(this.activeFilters));
    }
}

export const taskFilterManager = new TaskFilterManager();

/**
 * Setup UI dos filtros no Kanban
 */
export function setupFilterUI() {
    // Filtro por Status
    const statusButtons = document.querySelectorAll('[data-filter-status]');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.dataset.filterStatus;
            if (taskFilterManager.activeFilters.status === status) {
                taskFilterManager.setStatusFilter(null);
                btn.classList.remove('active');
            } else {
                document.querySelectorAll('[data-filter-status]').forEach(b => b.classList.remove('active'));
                taskFilterManager.setStatusFilter(status);
                btn.classList.add('active');
            }
        });
    });

    // Filtro por Prioridade
    const priorityButtons = document.querySelectorAll('[data-filter-priority]');
    priorityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const priority = btn.dataset.filterPriority;
            if (taskFilterManager.activeFilters.priority === priority) {
                taskFilterManager.setPriorityFilter(null);
                btn.classList.remove('active');
            } else {
                document.querySelectorAll('[data-filter-priority]').forEach(b => b.classList.remove('active'));
                taskFilterManager.setPriorityFilter(priority);
                btn.classList.add('active');
            }
        });
    });

    // Botão Limpar Filtros
    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            taskFilterManager.clearFilters();
            document.querySelectorAll('[data-filter-status], [data-filter-priority]').forEach(b => b.classList.remove('active'));
        });
    }
}
