import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/client';

export default function Dashboard() {
  const { t } = useTranslation();
  const { isAdmin, hasPermission, hasAnyPermission } = usePermission();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!data) return null;

  const paid = data.payments?.breakdown?.find((p) => p.status === 'PAID');

  // Build quick actions based on user permissions
  const quickActions = [];

  if (isAdmin() || hasAnyPermission('MANAGE_USERS', 'APPROVE_MEMBERS')) {
    quickActions.push({
      to: '/admin/users',
      icon: '👥',
      label: t('admin.manage_users'),
    });
  }

  if (isAdmin() || hasPermission('MANAGE_ROLES')) {
    quickActions.push({
      to: '/admin/roles',
      icon: '🛡️',
      label: t('admin.manage_roles'),
    });
  }

  if (isAdmin() || hasPermission('TRANSFER_ADMIN')) {
    quickActions.push({
      to: '/admin/transfer',
      icon: '🔄',
      label: t('admin.transfer_admin'),
    });
  }

  if (isAdmin() || hasPermission('MANAGE_CONFIG')) {
    quickActions.push({
      to: '/admin/config',
      icon: '⚙️',
      label: t('admin.config'),
    });
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__value">{data.members?.total || 0}</div>
          <div className="stat-card__label">{t('admin.total_members')}</div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-card__value">{data.members?.pending || 0}</div>
          <div className="stat-card__label">{t('admin.pending_approvals')}</div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__value">{data.members?.approved || 0}</div>
          <div className="stat-card__label">{t('admin.active_members')}</div>
        </div>
        <div className="stat-card stat-card--info">
          <div className="stat-card__value">₹{paid?.total ? parseFloat(paid.total).toLocaleString('en-IN') : '0'}</div>
          <div className="stat-card__label">{t('admin.payments_collected')}</div>
        </div>
      </div>

      {/* Role Distribution */}
      {data.roles?.length > 0 && (
        <div className="detail-section" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Role Distribution</h3>
          <div className="role-bars">
            {data.roles.map((r) => {
              const max = Math.max(...data.roles.map((x) => x.count), 1);
              return (
                <div key={r.role} className="role-bar">
                  <span className="role-bar__label">{r.role}</span>
                  <div className="role-bar__track">
                    <div className="role-bar__fill" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span className="role-bar__count">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions — only show actions the user has permissions for */}
      {quickActions.length > 0 && (
        <>
          <h3 className="section-title">Quick Actions</h3>
          <div className="action-list">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className="action-item">
                <span className="action-item__icon">{action.icon}</span>
                {action.label}
                <span className="action-item__arrow">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
