import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { usersApi } from '../api/users.api';
import { formatDate } from '../utils/formatters';

const RELATION_TYPES = ['FATHER','MOTHER','WIFE','HUSBAND','SON','DAUGHTER','BROTHER','SISTER','OTHER'];

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermission();
  const { user, logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Family state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [familyForm, setFamilyForm] = useState({ userId: '', relationType: 'FATHER' });
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState('');
  const [familySearch, setFamilySearch] = useState('');

  const photoRef = useRef();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await usersApi.getMe();
      const data = res.data;
      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        address: data.address || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
      });
      // Load family
      if (data.id) {
        try {
          const famRes = await usersApi.getFamilyRelations(data.id);
          const famData = famRes.data;
          setFamilyMembers(Array.isArray(famData) ? famData : (famData?.relations || famData?.familyRelations || []));
        } catch (famErr) {
          console.warn('Could not load family:', famErr);
          setFamilyMembers([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        address: form.address || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      };
      await usersApi.updateUser(profile.id, payload);
      setProfile({ ...profile, ...payload });
      setEditing(false);
      setSuccess(t('profile.profile_saved'));
      setTimeout(() => setSuccess(''), 3000);
      refreshUser && refreshUser();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.photo_size_error'));
      return;
    }

    setPhotoLoading(true);
    setError('');
    try {
      const res = await usersApi.uploadProfilePicture(file);
      setProfile({ ...profile, profilePictureUrl: res.data.profilePictureUrl });
      setSuccess(t('profile.photo_updated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setPhotoLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await usersApi.listUsers({ status: 'APPROVED', limit: 100 });
      const data = res.data;
      const users = Array.isArray(data) ? data : (data?.users || []);
      setAllUsers(users.filter(u => u.id !== profile?.id));
    } catch (err) {
      console.error(err);
      setAllUsers([]);
    }
  };

  const handleShowAddFamily = async () => {
    setShowAddFamily(true);
    setFamilyForm({ userId: '', relationType: 'FATHER' });
    setFamilySearch('');
    setFamilyError('');
    await loadAllUsers();
  };

  const handleAddFamily = async () => {
    if (!familyForm.userId) return;
    setFamilyLoading(true);
    setFamilyError('');
    try {
      await usersApi.addFamilyRelation(profile.id, {
        relatedUserId: familyForm.userId,
        relationType: familyForm.relationType,
      });
      // Reload family
      try {
        const famRes = await usersApi.getFamilyRelations(profile.id);
        const famData = famRes.data;
        setFamilyMembers(Array.isArray(famData) ? famData : (famData?.relations || famData?.familyRelations || []));
      } catch {
        setFamilyMembers([]);
      }
      setShowAddFamily(false);
    } catch (err) {
      setFamilyError(err.response?.data?.error || t('common.error'));
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleRemoveFamily = async (relationId) => {
    try {
      await usersApi.removeFamilyRelation(profile.id, relationId);
      setFamilyMembers(prev => Array.isArray(prev) ? prev.filter(r => r.id !== relationId) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const switchLang = () => {
    const next = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(familySearch.toLowerCase()) ||
    u.phone?.includes(familySearch)
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!profile) return null;

  const age = calculateAge(profile.dateOfBirth || form.dateOfBirth);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Toast messages */}
      {success && (
        <div style={{
          background: 'var(--color-success, #22c55e)', color: '#fff', padding: '10px 16px',
          borderRadius: 10, margin: '0 0 12px', fontSize: '0.85rem', textAlign: 'center'
        }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{
          background: 'var(--color-danger, #ef4444)', color: '#fff', padding: '10px 16px',
          borderRadius: 10, margin: '0 0 12px', fontSize: '0.85rem', textAlign: 'center'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-header__avatar" style={{ position: 'relative' }}>
          <div className="avatar avatar--xl" style={{ position: 'relative' }}>
            {profile.profilePictureUrl
              ? <img src={profile.profilePictureUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <span style={{ fontSize: '2rem', fontWeight: 700 }}>{profile.name?.[0]?.toUpperCase()}</span>
            }
          </div>
          {/* Camera button — only visible in edit mode */}
          {editing && (
            <label style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'var(--color-primary, #f59e0b)', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              border: '2px solid var(--color-bg-card, #1e1e2e)'
            }}>
              {photoLoading ? '⏳' : '📷'}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
                disabled={photoLoading}
              />
            </label>
          )}
        </div>
        <div className="profile-header__name">{profile.name}</div>
        <div className="profile-header__phone">📞 {profile.phone}</div>
        {age !== null && age > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {t('profile.age')}: {age} {t('profile.years')}
          </div>
        )}
        {profile.userRoles?.map((ur) => (
          <span key={ur.role?.id || ur.roleId} className="badge badge--primary" style={{ marginTop: 8 }}>
            {ur.role?.name}
          </span>
        ))}
      </div>

      {/* Details / Edit Section */}
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{t('profile.personal_info')}</h3>
          {!editing && (
            <button
              className="btn btn--outline"
              style={{ padding: '4px 14px', fontSize: '0.8rem' }}
              onClick={() => setEditing(true)}
            >
              ✏️ {t('profile.edit')}
            </button>
          )}
        </div>

        {editing ? (
          <div>
            {/* Photo upload hint */}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, textAlign: 'center' }}>
              📷 {t('profile.upload_photo')} — {t('profile.photo_size_error')}
            </p>

            <div className="form-group">
              <label>{t('profile.name')} *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('login.name_placeholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('profile.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>{t('profile.dob')}</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
              {form.dateOfBirth && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {t('profile.age')}: {calculateAge(form.dateOfBirth)} {t('profile.years')}
                </p>
              )}
            </div>
            <div className="form-group">
              <label>{t('profile.address')}</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('profile.address_placeholder')}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn--primary btn--full" onClick={handleSave} disabled={saving}>
                {saving ? `⏳ ${t('profile.saving')}` : `✅ ${t('profile.save')}`}
              </button>
              <button className="btn btn--outline btn--full" onClick={() => setEditing(false)}>
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="detail-row">
              <span className="detail-row__label">📧 {t('profile.email')}</span>
              <span className="detail-row__value">{profile.email || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">🎂 {t('profile.dob')}</span>
              <span className="detail-row__value">
                {profile.dateOfBirth
                  ? `${formatDate(profile.dateOfBirth)} (${calculateAge(profile.dateOfBirth)} ${t('profile.years')})`
                  : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">📍 {t('profile.address')}</span>
              <span className="detail-row__value">{profile.address || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Family Section */}
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>👨‍👩‍👧‍👦 {t('profile.family')}</h3>
          <button
            className="btn btn--outline"
            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
            onClick={handleShowAddFamily}
          >
            + {t('profile.add_family')}
          </button>
        </div>

        {/* Add Family Inline Form */}
        {showAddFamily && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12,
            padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
              {t('profile.add_family_title')}
            </div>

            <div className="form-group">
              <label>{t('profile.search_member')}</label>
              <input
                placeholder={t('profile.search_placeholder')}
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
              />
            </div>

            {filteredUsers.length > 0 && (
              <div style={{
                maxHeight: 160, overflowY: 'auto', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8
              }}>
                {filteredUsers.slice(0, 20).map(u => (
                  <div
                    key={u.id}
                    onClick={() => setFamilyForm({ ...familyForm, userId: u.id })}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem',
                      background: familyForm.userId === u.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', justifyContent: 'space-between'
                    }}
                  >
                    <span>{u.name}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{u.phone}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label>{t('profile.relation')}</label>
              <select
                value={familyForm.relationType}
                onChange={(e) => setFamilyForm({ ...familyForm, relationType: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'inherit', fontSize: '0.9rem'
                }}
              >
                {RELATION_TYPES.map(r => (
                  <option key={r} value={r}>{t(`relation_types.${r}`)}</option>
                ))}
              </select>
            </div>

            {familyError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: 8 }}>{familyError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn--primary btn--full"
                onClick={handleAddFamily}
                disabled={!familyForm.userId || familyLoading}
              >
                {familyLoading ? '⏳' : `+ ${t('profile.add_family')}`}
              </button>
              <button className="btn btn--outline btn--full" onClick={() => setShowAddFamily(false)}>
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        )}

        {!Array.isArray(familyMembers) || familyMembers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
            {t('profile.no_family')}
          </p>
        ) : (
          <div>
            {familyMembers.map((rel) => (
              <div key={rel.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar--sm" style={{
                    background: 'rgba(245,158,11,0.2)', color: 'var(--color-primary)',
                    fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                  }}>
                    {rel.relatedUser?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rel.relatedUser?.name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {t(`relation_types.${rel.relationType}`, rel.relationType)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFamily(rel.id)}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: 'none',
                    color: '#ef4444', borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer', fontSize: '0.8rem'
                  }}
                >
                  {t('profile.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Dashboard */}
      {(isAdmin() || hasPermission('VIEW_DASHBOARD')) && (
        <div className="detail-section" style={{ border: '1px solid var(--color-primary)' }}>
          <div className="detail-row" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>
            <span className="detail-row__label" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
              👑 Admin Dashboard
            </span>
            <span className="detail-row__value" style={{ color: 'var(--color-primary)' }}>→</span>
          </div>
        </div>
      )}

      {/* Language & Logout */}
      <div className="detail-section">
        <div className="detail-row" onClick={switchLang} style={{ cursor: 'pointer' }}>
          <span className="detail-row__label">🌐 {t('profile.lang')}</span>
          <span className="detail-row__value">{i18n.language === 'hi' ? 'हिंदी' : 'English'} →</span>
        </div>
      </div>

      <button className="btn btn--danger btn--full" style={{ marginTop: 8 }} onClick={logout}>
        🚪 {t('profile.logout')}
      </button>
    </div>
  );
}
