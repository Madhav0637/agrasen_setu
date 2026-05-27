import api from './client';

export const postsApi = {
  list: (params) => api.get('/posts', { params }),
  get: (id) => api.get(`/posts/${id}`),
  create: (data, files) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.type) formData.append('type', data.type);
    if (data.isPinned) formData.append('isPinned', data.isPinned);
    if (files) {
      files.forEach((file) => formData.append('files', file));
    }
    return api.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  togglePin: (id) => api.patch(`/posts/${id}/pin`),
};
