import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

/**
 * Route guard for admin pages.
 * Only allows access to users who are Admin or have VIEW_DASHBOARD permission.
 * Non-authorized users are redirected to home.
 */
export default function AdminRoute({ children, requiredPermission }) {
  const { user, loading } = useAuth();
  const { isAdmin, hasPermission, hasAnyPermission } = usePermission();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // For specific sub-pages, check the required permission
  if (requiredPermission) {
    if (!isAdmin() && !hasPermission(requiredPermission)) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
            You don't have permission to access this page.
          </p>
          <a href="/" className="btn btn--primary">← Go Home</a>
        </div>
      );
    }
    return children;
  }

  // For the general admin area, check VIEW_DASHBOARD or Admin role
  if (!isAdmin() && !hasPermission('VIEW_DASHBOARD')) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
          You need admin privileges to access this area.
        </p>
        <a href="/" className="btn btn--primary">← Go Home</a>
      </div>
    );
  }

  return children;
}
