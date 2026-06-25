import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export async function fetchProducts({ limit = 20, category, cursor } = {}) {
  const params = { limit };
  if (category) params.category = category;
  if (cursor) params.cursor = cursor;

  const response = await api.get('/products', { params });
  return response.data;
}

export default api;
