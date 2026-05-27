import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function Members() {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/users', { params: { search, page, limit: 20, status: 'APPROVED' } });
        setMembers(res.data.data || []);
        setTotal(res.data.pagination?.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search, page]);

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder={t('members.search_placeholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <div className="empty-state__text">{t('members.no_members')}</div>
        </div>
      ) : (
        <>
          {members.map((m) => {
            // Determine the highest-priority role to show as primary badge
            const roles = m.userRoles?.map(ur => ur.role?.name).filter(Boolean) || [];

            const getBadgeClass = (roleName) => {
              if (roleName === 'Admin') return 'badge--primary';
              if (roleName === 'Manager') return 'badge--info';
              if (roleName === 'Member') return 'badge--success';
              return 'badge--warning';
            };

            return (
              <div key={m.id} className="member-item">
                <div className="avatar avatar--md">
                  {m.profilePictureUrl ? <img src={m.profilePictureUrl} alt="" /> : m.name?.[0]}
                </div>
                <div className="member-item__info">
                  <div className="member-item__name">{m.name}</div>
                  <div className="member-item__phone">{m.phone}</div>
                  {roles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {roles.map((role) => (
                        <span key={role} className={`badge ${getBadgeClass(role)}`} style={{ fontSize: '0.68rem' }}>
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {total > 20 && (
            <div className="pagination">
              <button className="btn btn--outline btn--sm" disabled={page === 1} onClick={() => setPage(page - 1)}>←</button>
              <span>{page} / {Math.ceil(total / 20)}</span>
              <button className="btn btn--outline btn--sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
