import api from './client';

export const paymentsApi = {
  listPlans: () => api.get('/payments/plans'),
  createPlan: (data) => api.post('/payments/plans', data),
  getMyPayments: () => api.get('/payments/me'),
  createOrder: (planId, membershipYear) =>
    api.post('/payments/create-order', { planId, membershipYear }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  listPayments: (params) => api.get('/payments', { params }),
  getStats: (year) => api.get('/payments/stats', { params: { year } }),
};
