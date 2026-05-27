import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ConfirmModal from '../../components/common/ConfirmModal';
import { HiPencil, HiTrash } from 'react-icons/hi';

export default function ManageRoles() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissionIds, setFormPermissionIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const load = async () => {
    try {
      const [resRoles, resPerms] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions')
      ]);
      setRoles(resRoles.data || []);
      setPermissions(resPerms.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingRoleId(null);
    setFormName('');
    setFormDescription('');
    setFormPermissionIds([]);
    setShowForm(false);
  };

  const handleTogglePermission = (permId) => {
    setFormPermissionIds(prev => {
      if (prev.includes(permId)) return prev.filter(id => id !== permId);
      return [...prev, permId];
    });
  };

  const handleEditRole = (role) => {
    setEditingRoleId(role.id);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissionIds(role.permissions?.map(rp => rp.permission.id) || []);
    setShowForm(true);
    // Scroll to top so form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/roles/${roleToDelete.id}`);
      load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Role name is required.');
    if (formPermissionIds.length === 0) return alert('Select at least one permission.');
    
    setSaving(true);
    try {
      let targetRoleId = editingRoleId;

      if (targetRoleId) {
        // Update existing role name/description
        await api.put(`/roles/${targetRoleId}`, { 
          name: formName.trim(), 
          description: formDescription.trim() || undefined 
        });
      } else {
        // Create new role
        const res = await api.post('/roles', { 
          name: formName.trim(), 
          description: formDescription.trim() || undefined 
        });
        targetRoleId = res.data?.id;
      }
      
      // Assign/overwrite permissions
      if (targetRoleId) {
        await api.post(`/roles/${targetRoleId}/permissions`, { permissionIds: formPermissionIds });
      }
      
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('sidebar.manage_roles', 'Positions / Roles')}</h2>
        {!showForm && (
          <button className="btn btn--primary btn--sm" onClick={() => { resetForm(); setShowForm(true); }}>
            + Create Role
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Position"
        message={`Are you sure you want to permanently remove "${roleToDelete?.name}"? All users with this role will lose its permissions.`}
        confirmText="Delete Position"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDanger={true}
      />

      {showForm && (
        <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24, borderColor: 'var(--color-primary)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>
            {editingRoleId ? '✏️ Edit Position' : '➕ Create New Position'}
          </h3>

          <div className="form-group">
            <label>Position Name *</label>
            <input 
              value={formName} 
              onChange={e => setFormName(e.target.value)} 
              placeholder="e.g., Event Coordinator" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input 
              value={formDescription} 
              onChange={e => setFormDescription(e.target.value)} 
              placeholder="Briefly describe the role duties..." 
            />
          </div>
          
          <div className="form-group">
            <label>Permissions *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px', marginTop: '8px' }}>
              {permissions.map(p => {
                const isActive = formPermissionIds.includes(p.id);
                return (
                  <label 
                    key={p.id} 
                    className={`perm-item ${isActive ? 'perm-item--active' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      onChange={() => handleTogglePermission(p.id)}
                      style={{ width: '16px', height: '16px', minWidth: '16px' }}
                    />
                    <span>{p.code.replace(/_/g, ' ')}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn--primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : (editingRoleId ? 'Update Position' : 'Create Position')}
            </button>
            <button type="button" className="btn btn--outline" onClick={resetForm} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {roles.map((role) => (
        <div key={role.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>{role.name}</h3>
              <div style={{ display: 'flex', gap: 6, marginTop: '4px', flexWrap: 'wrap' }}>
                {role.isSystem && <span className="badge badge--info">System</span>}
                <span className="badge badge--primary">{role._count?.userRoles || 0} users</span>
              </div>
            </div>

            {!role.isSystem && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => handleEditRole(role)}
                  title="Edit Responsibilities"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '4px' }}
                >
                  <HiPencil size={20} />
                </button>
                <button 
                  onClick={() => { setRoleToDelete(role); setDeleteModalOpen(true); }}
                  title="Delete Position"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px' }}
                >
                  <HiTrash size={20} />
                </button>
              </div>
            )}
          </div>

          {role.description && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{role.description}</p>
          )}
          <div className="permission-chips">
            {role.permissions?.map((rp) => (
              <span key={rp.permission.id} className="permission-chip">{rp.permission.code}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
