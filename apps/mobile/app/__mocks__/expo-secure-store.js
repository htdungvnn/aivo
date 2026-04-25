// Manual mock for expo-secure-store
const storage = {};

module.exports = {
  getItem: async (key) => storage[key] || null,
  getItemAsync: async (key) => storage[key] || null,
  setItem: async (key, value) => { storage[key] = value; },
  setItemAsync: async (key, value) => { storage[key] = value; },
  deleteItem: async (key) => { delete storage[key]; },
  deleteItemAsync: async (key) => { delete storage[key]; },
  clear: async () => { Object.keys(storage).forEach(k => delete storage[k]); },
  clearAsync: async () => { Object.keys(storage).forEach(k => delete storage[k]); },
};
