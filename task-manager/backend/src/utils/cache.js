class MemoryCache {
    constructor() {
        this.store = new Map();
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        if (item.expiresAt <= Date.now()) {
            this.store.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value, ttlMs = 15000) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
        return value;
    }

    delete(key) {
        this.store.delete(key);
    }

    deletePattern(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    clear() {
        this.store.clear();
    }
}

export const cache = new MemoryCache();
