import api from './client';

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  send: (data) => api.post('/notifications/send', data),
  sendBulk: (data) => api.post('/notifications/bulk', data),
};
