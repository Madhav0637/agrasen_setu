import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { usersApi } from '../api/users.api';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Steps: phone → otp → register → pending
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // After OTP — returned user/tokens for new user registration
  const [authData, setAuthData] = useState(null);

  // Registration form
  const [regForm, setRegForm] = useState({
    name: '',
    dateOfBirth: '',
    address: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const photoRef = useRef();

  const switchLang = () => {
    const next = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/send-otp', { phone });
      if (res.data.otp) setDevOtp(res.data.otp);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });

      if (res.data.needsProfileSetup) {
        // Profile incomplete — collect name, DOB, photo before submitting for approval
        setAuthData(res.data);
        setStep('register');
        return;
      }

      if (res.data.needsApproval) {
        // Profile complete, waiting for admin approval
        setStep('pending');
        return;
      }

      // Existing approved user — go straight to app
      login(res.data.accessToken, res.data.refreshToken, res.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setRegError(t('profile.photo_size_error'));
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim()) {
      setRegError(t('login.name_label') + ' is required');
      return;
    }
    if (!regForm.dateOfBirth) {
      setRegError(t('login.dob_label') + ' is required');
      return;
    }
    if (!regForm.address.trim()) {
      setRegError(t('login.address_label') + ' is required');
      return;
    }
    if (!photoFile) {
      setRegError(t('login.photo_required', 'Profile picture is required'));
      return;
    }

    setRegLoading(true);
    setRegError('');

    try {
      // First: log the user in with their tokens so we can make authenticated calls
      login(authData.accessToken, authData.refreshToken, authData.user);

      // Update profile details
      await usersApi.updateUser(authData.user.id, {
        name: regForm.name,
        dateOfBirth: regForm.dateOfBirth ? new Date(regForm.dateOfBirth).toISOString() : undefined,
        address: regForm.address,
      });

      // Upload profile picture
      await usersApi.uploadProfilePicture(photoFile);

      // Profile complete — clear auth tokens (user is still PENDING)
      // and show the "waiting for approval" screen
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setStep('pending');
    } catch (err) {
      setRegError(err.response?.data?.error || t('common.error'));
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Language toggle */}
        <div className="login-card__lang">
          <button className="lang-toggle" onClick={switchLang}>
            {i18n.language === 'hi' ? 'English' : 'हिंदी'}
          </button>
        </div>

        {/* Header */}
        <div className="login-card__header">
          <div className="login-card__logo">अ</div>
          <h1>{t('app_name')}</h1>
          <div className="login-subtitle">{t('app_subtitle')}</div>
        </div>

        {/* Step: Phone */}
        {step === 'phone' && (
          <form className="login-card__form" onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>{t('login.phone_label')}</label>
              <div className="input-group">
                <span className="input-group__prefix">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder={t('login.phone_placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            </div>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
            <button className="btn btn--primary btn--full" disabled={loading || phone.length < 10}>
              {loading ? '...' : t('login.send_otp')}
            </button>
          </form>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <form className="login-card__form" onSubmit={handleVerifyOtp}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center' }}>
              {t('login.otp_sent_to')} +91 {phone}
            </p>
            <div className="form-group">
              <label>{t('login.enter_otp')}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem', fontWeight: 700 }}
              />
            </div>
            {devOtp && (
              <div className="dev-badge" style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', textAlign: 'center',
                marginBottom: 12, color: 'var(--color-primary)'
              }}>
                🔓 Dev Mode — OTP: <strong>{devOtp}</strong>
              </div>
            )}
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
            <button className="btn btn--primary btn--full" disabled={loading || otp.length < 6}>
              {loading ? '...' : t('login.verify')}
            </button>
            <button type="button" className="btn-link" onClick={() => setStep('phone')}>
              ← {t('login.go_back')}
            </button>
          </form>
        )}

        {/* Step: Register (new user profile form) */}
        {step === 'register' && (
          <form className="login-card__form" onSubmit={handleRegister}>
            <h3 style={{ textAlign: 'center', marginBottom: 4 }}>{t('login.complete_profile')}</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginBottom: 20 }}>
              {t('login.complete_profile_desc')}
            </p>

            {/* Profile Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: photoPreview ? '2px solid var(--color-success, #22c55e)' : '2px dashed rgba(245,158,11,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative'
                }}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2rem' }}>📷</span>
                }
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                {photoPreview ? t('login.change_photo') : t('login.add_photo')} *
              </span>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
            </div>

            <div className="form-group">
              <label>{t('login.full_name')} *</label>
              <input
                type="text"
                placeholder={t('login.name_example')}
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>{t('login.dob_label')} *</label>
              <input
                type="date"
                value={regForm.dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
              />
              {regForm.dateOfBirth && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {t('login.age')}: {Math.floor((Date.now() - new Date(regForm.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))} {t('login.years')}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>{t('login.address_label')} *</label>
              <textarea
                placeholder={t('login.address_placeholder')}
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>

            {regError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 8 }}>❌ {regError}</p>
            )}

            <button className="btn btn--primary btn--full" type="submit" disabled={regLoading}>
              {regLoading ? `⏳ ${t('login.saving')}` : `✅ ${t('login.submit_for_approval', 'Submit for Approval')}`}
            </button>
          </form>
        )}

        {/* Step: Pending approval */}
        {step === 'pending' && (
          <div className="login-card__pending">
            <div className="pending-icon">⏳</div>
            <h2>{t('login.pending_title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{t('login.pending_msg')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
