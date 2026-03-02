import { get, set, del } from 'idb-keyval';

// IndexedDB-backed persister for React Query
const IDB_KEY = 'medrepdesk-query-cache';

export const idbPersister = {
  persistClient: async (client) => {
    await set(IDB_KEY, client);
  },
  restoreClient: async () => {
    return await get(IDB_KEY);
  },
  removeClient: async () => {
    await del(IDB_KEY);
  },
};
