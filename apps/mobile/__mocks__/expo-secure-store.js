// Manual mock for expo-secure-store
const storage = {};

module.exports = {
  getItem: async (key) => storage[key] || null,
  setItem: async (key, value) => { storage[key] = value; },
  removeItem: async (key) => { delete storage[key]; },
  clear: async () => { Object.keys(storage).forEach(k => delete storage[k]); },
  // Async-suffixed versions (the real module uses these)
  getItemAsync: async (key) => storage[key] || null,
  setItemAsync: async (key, value) => { storage[key] = value; },
  deleteItemAsync: async (key) => { delete storage[key]; },
  clearAsync: async () => { Object.keys(storage).forEach(k => delete storage[k]); },
};
