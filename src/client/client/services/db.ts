const DB_NAME = 'ScreenCap_DB';
const STORE = 'recordings';

export const dbService = {
    open: () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const database = (e.target as IDBOpenDBRequest).result;
                if (!database.objectStoreNames.contains(STORE)) {
                    database.createObjectStore(STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    // Save with Timestamp
    save: async (blob: Blob): Promise<string> => {
        const database = await dbService.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);

            // We store an object now, not just the blob, to keep metadata
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
    },

    // Get Blob
    get: async (key: string): Promise<Blob | null> => {
        const database = await dbService.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE, 'readonly');
            const store = tx.objectStore(STORE);
            const req = store.get(key);
            req.onsuccess = () => {
                // Support both old format (blob only) and new format (object)
                const result = req.result;
                if (!result) resolve(null);
                else if (result.blob) resolve(result.blob); // New format
                else resolve(result); // Old format (just blob)
            };
            req.onerror = () => reject(req.error);
        });
    },

    // Delete specific recording
    delete: async (key: string): Promise<void> => {
        const database = await dbService.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const req = store.delete(key);
            req.onsuccess = () => {
                console.log(`Debug: Deleted recording ${key}`);
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    },

    // TTL Cleanup (Garbage Collection)
    cleanupOldRecords: async (maxAgeMs: number = 2 * 60 * 60 * 1000): Promise<void> => { // Default 2 hours
        const database = await dbService.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const req = store.openCursor();

            const now = Date.now();
            let deletedCount = 0;

            req.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (cursor) {
                    const record = cursor.value;
                    // Check if record is older than TTL
                    // Note: Old format records (just blobs) won't have createdAt, so we might delete them or keep them. 
                    // Let's assume if it has no timestamp, it's 'old' or invalid in this context, but safer to delete to ensure cleanup.
                    // However, for safety, let's only delete if we are SURE it's old (has timestamp).
                    if (record.createdAt && (now - record.createdAt > maxAgeMs)) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                } else {
                    if (deletedCount > 0) console.log(`Debug: Cleaned up ${deletedCount} expired recordings.`);
                    resolve();
                }
            };
            req.onerror = () => reject(req.error);
        });
    }
};

