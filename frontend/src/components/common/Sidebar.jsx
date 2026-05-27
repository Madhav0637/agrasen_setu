import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import {
  HiHome,
  HiUserGroup,
  HiDocumentText,
  HiChartBar,
  HiCreditCard,
  HiBell,
  HiCog,
  HiLogout,
  HiMenu,
  HiX,
} from 'react-icons/hi';
import { useState } from 'react';
import { getInitials } from '../../utils/formatters';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { hasPermission, isAdmin } = usePermission();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: HiHome, show: true },
    { path: '/members', label: 'Members', icon: HiUserGroup, show: true },
    { path: '/posts', label: 'Posts', icon: HiDocumentText, show: true },
    { path: '/polls', label: 'Polls', icon: HiChartBar, show: true },
    { path: '/payments', label: 'Payments', icon: HiCreditCard, show: true },
    { path: '/notifications', label: 'Notifications', icon: HiBell, show: true },
    {
      path: '/admin/dashboard',
      label: 'Admin',
      icon: HiCog,
      show: isAdmin() || hasPermission('VIEW_DASHBOARD'),
    },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && (
          <div className="sidebar__brand">
            <div className="sidebar__logo">अ</div>
            <span className="sidebar__title">Agrasen Setu</span>
          </div>
        )}
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <HiMenu size={20} /> : <HiX size={20} />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.filter((item) => item.show).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar__link ${isActive(item.path) ? 'sidebar__link--active' : ''}`}
            title={item.label}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">
        <Link to="/profile" className="sidebar__user" title={user?.name}>
          {user?.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt="" className="sidebar__avatar" />
          ) : (
            <div className="sidebar__avatar sidebar__avatar--initials">
              {getInitials(user?.name)}
            </div>
          )}
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name}</span>
              <span className="sidebar__user-phone">{user?.phone}</span>
            </div>
          )}
        </Link>
        <button className="sidebar__logout" onClick={logout} title="Logout">
          <HiLogout size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
