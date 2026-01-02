const DB_NAME = 'ScreenCap_DB';
const STORE = 'recordings';

const db = {
    open: () => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE)) {
                    database.createObjectStore(STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    // Save with Metadata (Updated to match React service)
    save: async (blob) => {
        const database = await db.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);

            const id = `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const record = {
                id: id,
                blob: blob,
                createdAt: Date.now()
            };

            const req = store.put(record, id);

            req.onsuccess = () => resolve(id);
            req.onerror = () => reject(req.error);
        });
    }
    // We don't strictly need 'get' or 'delete' in the Agent context usually,
    // but good to keep it minimal. Agent mainly writes.
};

window.db = db;

