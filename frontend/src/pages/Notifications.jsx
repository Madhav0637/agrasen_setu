import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { formatTimeAgo } from '../utils/formatters';

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data.data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, status: 'READ' })));
    } catch (err) { console.error(err); }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => n.id === id ? { ...n, status: 'READ' } : n));
    } catch (err) { console.error(err); }
  };

  const channelIcon = { SMS: '💬', PUSH: '🔔', WHATSAPP: '📱', IN_APP: '📌' };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      {notifications.length > 0 && (
        <button className="btn-link" style={{ marginBottom: 12, display: 'block' }} onClick={markAllRead}>
          {t('notifications.mark_all_read')}
        </button>
      )}

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔔</div>
          <div className="empty-state__text">{t('notifications.no_notifications')}</div>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className={`notification-item ${n.status !== 'READ' ? 'notification-item--unread' : ''}`}
            onClick={() => n.status !== 'READ' && markRead(n.id)}
          >
            <div className="notification-item__icon">{channelIcon[n.channel] || '🔔'}</div>
            <div className="notification-item__content">
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <div className="notification-item__time">{formatTimeAgo(n.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
