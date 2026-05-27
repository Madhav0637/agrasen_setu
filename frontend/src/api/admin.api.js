import api from './client';

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  listRoles: () => api.get('/roles'),
  createRole: (data) => api.post('/roles', data),
  updateRole: (id, data) => api.put(`/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/roles/${id}`),
  listPermissions: () => api.get('/roles/permissions'),
  assignPermissions: (roleId, permissionIds) =>
    api.post(`/roles/${roleId}/permissions`, { permissionIds }),
  assignRole: (userId, roleId) =>
    api.post(`/roles/users/${userId}/roles`, { roleId }),
  removeRole: (userId, roleId) =>
    api.delete(`/roles/users/${userId}/roles/${roleId}`),
  searchUsers: (params) => api.get('/search/users', { params }),
  searchPosts: (params) => api.get('/search/posts', { params }),
};
