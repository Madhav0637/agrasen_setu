import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import Avatar from '../../components/common/Avatar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { HiSearch } from 'react-icons/hi';

export default function ManageUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState({});
  const [assigningUserId, setAssigningUserId] = useState(null);

  // Success/Error toast
  const [toast, setToast] = useState(null);

  // Role removal confirmation
  const [removeRoleModal, setRemoveRoleModal] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState(null); // { userId, roleId, roleName, userName }
  const [removingRole, setRemovingRole] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { status: filter, limit: 50 };
      if (search.trim()) params.search = search.trim();

      const [resUsers, resRoles] = await Promise.all([
        api.get('/users', { params }),
        api.get('/roles')
      ]);
      setUsers(resUsers.data.data || []);
      setRoles(resRoles.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => { load(); }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleStatus = async (userId, status) => {
    try {
      await api.patch(`/users/${userId}/status`, { status });
      setUsers(users.filter((u) => u.id !== userId));
      showToast(`User ${status.toLowerCase()} successfully`);
    } catch (err) { 
      console.error(err); 
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleAssignRole = async (userId) => {
    const roleId = selectedRoles[userId];
    if (!roleId) return showToast('Please select a position first.', 'error');
    
    setAssigningUserId(userId);
    try {
      await api.post(`/roles/users/${userId}/roles`, { roleId });
      showToast('Position assigned successfully!');
      setSelectedRoles({ ...selectedRoles, [userId]: '' });
      load();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to assign position', 'error');
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemoveRoleClick = (userId, roleId, roleName, userName) => {
    setRoleToRemove({ userId, roleId, roleName, userName });
    setRemoveRoleModal(true);
  };

  const handleConfirmRemoveRole = async () => {
    if (!roleToRemove) return;
    setRemovingRole(true);
    try {
      await api.delete(`/roles/users/${roleToRemove.userId}/roles/${roleToRemove.roleId}`);
      showToast(`"${roleToRemove.roleName}" removed from ${roleToRemove.userName}`);
      setRemoveRoleModal(false);
      setRoleToRemove(null);
      load();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to remove position', 'error');
    } finally {
      setRemovingRole(false);
    }
  };

  return (
    <div>
      {/* Floating Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 'calc(var(--top-bar-height) + 12px)', left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 'var(--radius-md)', zIndex: 9999,
          background: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
          color: 'white', fontWeight: 600, fontSize: '0.85rem',
          boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      {/* Role Removal Confirmation Modal */}
      <ConfirmModal
        isOpen={removeRoleModal}
        title="Remove Position"
        message={`Are you sure you want to remove "${roleToRemove?.roleName}" from ${roleToRemove?.userName}? They will lose all permissions associated with this position.`}
        confirmText={removingRole ? 'Removing...' : 'Remove Position'}
        onConfirm={handleConfirmRemoveRole}
        onCancel={() => { setRemoveRoleModal(false); setRoleToRemove(null); }}
        isDanger={true}
      />

      {/* Search Bar */}
      <div className="manage-search">
        <span className="manage-search__icon"><HiSearch /></span>
        <input 
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
          <button
            key={s}
            className={`filter-tab ${filter === s ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">✅</div>
          <div className="empty-state__text">No {filter.toLowerCase()} users{search ? ` matching "${search}"` : ''}</div>
        </div>
      ) : (
        users.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={u.profilePictureUrl} name={u.name} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-row__name">{u.name}</div>
                <div className="user-row__phone">{u.phone}</div>
                {/* Existing roles with unassign buttons */}
                {u.userRoles?.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {u.userRoles.map((ur) => (
                      <span 
                        key={ur.role?.id || Math.random()} 
                        className="badge badge--info" 
                        style={{ 
                          fontSize: '0.68rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          paddingRight: '4px',
                        }}
                      >
                        {ur.role?.name}
                        {filter === 'APPROVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRoleClick(u.id, ur.role?.id, ur.role?.name, u.name);
                            }}
                            title={`Remove ${ur.role?.name}`}
                            style={{
                              background: 'rgba(255,255,255,0.2)',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: 0,
                              lineHeight: 1,
                              marginLeft: '2px',
                              flexShrink: 0,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {filter === 'PENDING' && (
                  <>
                    <button className="btn btn--success btn--sm" onClick={() => handleStatus(u.id, 'APPROVED')}>
                      {t('admin.approve', 'Approve')}
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => handleStatus(u.id, 'REJECTED')}>
                      {t('admin.reject', 'Reject')}
                    </button>
                  </>
                )}
                {filter === 'APPROVED' && (
                  <button className="btn btn--warning btn--sm" onClick={() => handleStatus(u.id, 'SUSPENDED')}>
                    Suspend
                  </button>
                )}
                {filter === 'SUSPENDED' && (
                  <button className="btn btn--success btn--sm" onClick={() => handleStatus(u.id, 'APPROVED')}>
                    {t('admin.approve', 'Approve')}
                  </button>
                )}
              </div>
            </div>

            {/* Role Assignment for Approved users */}
            {filter === 'APPROVED' && (
              <div style={{ 
                marginTop: 12, 
                display: 'flex', 
                gap: 8, 
                alignItems: 'center', 
                borderTop: '1px solid var(--color-border)', 
                paddingTop: 12 
              }}>
                <select 
                  value={selectedRoles[u.id] || ''} 
                  onChange={e => setSelectedRoles({...selectedRoles, [u.id]: e.target.value})}
                  style={{ flex: 1 }}
                >
                  <option value="">Assign a position...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button 
                   className="btn btn--primary btn--sm" 
                   onClick={() => handleAssignRole(u.id)}
                   disabled={!selectedRoles[u.id] || assigningUserId === u.id}
                   style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                   {assigningUserId === u.id ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
