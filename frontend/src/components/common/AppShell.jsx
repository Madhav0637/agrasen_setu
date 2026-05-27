import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/client';
import { requestForToken, onMessageListener } from '../../firebase';

export default function AppShell() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const token = await requestForToken();
        if (token) {
          await api.post('/fcm/register', { token, deviceType: 'WEB' });
          console.log('FCM token registered with backend');
        }
      } catch (err) {
        console.error('Failed to setup notifications', err);
      }
    };

    if (user) {
      setupNotifications();
    }

    onMessageListener().then(payload => {
      console.log('Received foreground message:', payload);
      // Optional: Add a toast notification here
    }).catch(err => console.log('failed to receive msg', err));
  }, [user]);

  const switchLang = () => {
    const next = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <span className="top-bar__title">{t('app_name')}</span>
        <div className="top-bar__actions">
          <button className="lang-toggle" onClick={switchLang}>
            {i18n.language === 'hi' ? 'EN' : 'हिं'}
          </button>
          <button className="icon-btn" onClick={() => navigate('/notifications')}>
            🔔
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="page-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`} end>
          <span className="bottom-nav__icon">🏠</span>
          <span>{t('nav.home')}</span>
        </NavLink>

        <NavLink to="/members" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">👥</span>
          <span>{t('nav.members')}</span>
        </NavLink>

        <NavLink to="/posts" className="bottom-nav__fab">
          ＋
        </NavLink>

        <NavLink to="/payments" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">💳</span>
          <span>{t('nav.payments')}</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">👤</span>
          <span>{t('nav.profile')}</span>
        </NavLink>
      </nav>
    </div>
  );
}
