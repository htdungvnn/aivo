// In-memory mock for expo-secure-store
const store: Record<string, string> = {};

module.exports = {
  getItem: async (key: string) => store[key] || null,
  setItem: async (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: async (key: string) => {
    delete store[key];
  },
  clear: async () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  getItemAsync: async (key: string) => store[key] || null,
  setItemAsync: async (key: string, value: string) => {
    store[key] = value;
  },
  deleteItemAsync: async (key: string) => {
    delete store[key];
  },
  clearAsync: async () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
