import api from './client';

export const usersApi = {
  getMe: () => api.get('/users/me'),
  getUser: (id) => api.get(`/users/${id}`),
  listUsers: (params) => api.get('/users', { params }),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/me/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadIdProof: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/me/id-proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFamilyRelations: (id) => api.get(`/users/${id}/family`),
  addFamilyRelation: (id, data) => api.post(`/users/${id}/family`, data),
  removeFamilyRelation: (id, relationId) => api.delete(`/users/${id}/family/${relationId}`),
};
