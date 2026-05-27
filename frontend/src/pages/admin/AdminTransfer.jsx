import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

export default function AdminTransfer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // OTP flow states
  const [step, setStep] = useState('select'); // 'select' | 'otp' | 'confirm'
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users', { params: { status: 'APPROVED', search, limit: 20 } });
        setMembers(res.data.data || []);
      } catch (err) { console.error(err); }
    };
    load();
  }, [search]);

  // Step 1: Send OTP to current admin's phone
  const handleSendOtp = async () => {
    if (!selectedUser) return;
    setOtpSending(true);
    setError('');
    try {
      const res = await api.post('/admin/transfer-admin/send-otp');
      if (res.data.otp) setDevOtp(res.data.otp); // Dev mode OTP
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Submit transfer with OTP
  const handleTransfer = async () => {
    if (!selectedUser || !otpCode) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/transfer-admin', {
        targetUserId: selectedUser.id,
        otpCode,
      });
      setSuccess(t('admin.transfer_admin') + ' ✅');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('select');
    setOtpCode('');
    setDevOtp('');
    setError('');
  };

  return (
    <div>
      {/* Warning banner */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
          ⚠️ {t('admin.transfer_admin')}: This action cannot be undone. You will become a regular member.
        </p>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div style={{
          background: 'var(--color-danger, #ef4444)', color: '#fff', padding: '10px 16px',
          borderRadius: 10, margin: '0 0 12px', fontSize: '0.85rem', textAlign: 'center'
        }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{
          background: 'var(--color-success, #22c55e)', color: '#fff', padding: '10px 16px',
          borderRadius: 10, margin: '0 0 12px', fontSize: '0.85rem', textAlign: 'center'
        }}>
          {success}
        </div>
      )}

      {/* Step: Select User */}
      {step === 'select' && (
        <>
          <div className="search-bar">
            <input
              placeholder={t('members.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selectedUser && (
            <div className="card" style={{ borderColor: 'var(--color-primary)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar avatar--md">{selectedUser.name?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedUser.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{selectedUser.phone}</div>
                </div>
              </div>
              <button
                className="btn btn--warning btn--full"
                style={{ marginTop: 12 }}
                onClick={handleSendOtp}
                disabled={otpSending}
              >
                {otpSending ? '⏳ Sending OTP...' : '🔐 Verify & Transfer →'}
              </button>
            </div>
          )}

          {members.map((m) => (
            <div
              key={m.id}
              className="member-item"
              onClick={() => setSelectedUser(m)}
              style={{ cursor: 'pointer', borderColor: selectedUser?.id === m.id ? 'var(--color-primary)' : undefined }}
            >
              <div className="avatar avatar--md">{m.name?.[0]}</div>
              <div className="member-item__info">
                <div className="member-item__name">{m.name}</div>
                <div className="member-item__phone">{m.phone}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Step: Enter OTP */}
      {step === 'otp' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔐</div>
          <h3 style={{ marginBottom: 8 }}>OTP Verification</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            An OTP has been sent to your registered phone number. Enter it below to confirm the admin transfer.
          </p>

          {/* Dev mode OTP hint */}
          {devOtp && (
            <div style={{
              background: 'var(--color-primary)', color: '#fff', padding: '8px 12px',
              borderRadius: 8, marginBottom: 12, fontSize: '0.8rem'
            }}>
              🔓 Dev Mode — OTP: <strong>{devOtp}</strong>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div className="avatar avatar--md">{selectedUser?.name?.[0]}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>Transfer to: {selectedUser?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{selectedUser?.phone}</div>
            </div>
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            style={{
              textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em',
              padding: '12px', width: '100%', marginBottom: 16,
              background: 'var(--color-bg-input, #1a1a2e)',
              border: '2px solid var(--color-border, #333)',
              borderRadius: 12, color: 'inherit',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--danger btn--full"
              onClick={handleTransfer}
              disabled={loading || otpCode.length < 6}
            >
              {loading ? '⏳ Transferring...' : '✅ Confirm Transfer'}
            </button>
            <button className="btn btn--outline btn--full" onClick={handleCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
