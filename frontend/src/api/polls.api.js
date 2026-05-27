import api from './client';

export const pollsApi = {
  list: (params) => api.get('/polls', { params }),
  get: (id) => api.get(`/polls/${id}`),
  create: (data) => api.post('/polls', data),
  vote: (pollId, optionId) => api.post(`/polls/${pollId}/vote`, { optionId }),
  close: (id) => api.patch(`/polls/${id}/close`),
  delete: (id) => api.delete(`/polls/${id}`),
};
