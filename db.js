import { CONFIG } from './constants.js';

/**
 * DB SERVICE
 * Provides a generic interface for data persistence.
 * Replace internals with Supabase calls when migrating.
 */
export const DB = {
    _db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                Object.values(CONFIG.STORES).forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });
            };

            request.onsuccess = () => {
                this._db = request.result;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, id) {
        return new Promise((resolve) => {
            const tx = this._db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
        });
    },

    async put(storeName, data) {
        return new Promise((resolve) => {
            const tx = this._db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(data);
            tx.oncomplete = () => resolve(true);
        });
    },

    async delete(storeName, id) {
        return new Promise((resolve) => {
            const tx = this._db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve(true);
        });
    }
};

