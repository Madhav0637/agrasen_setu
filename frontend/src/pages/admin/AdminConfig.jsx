import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

export default function AdminConfig() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState({});
  const [fee, setFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/config');
        setConfigs(res.data || {});
        if (res.data?.membership_fee?.value) {
          setFee(res.data.membership_fee.value);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSaveFee = async () => {
    setSaving(true);
    try {
      await api.put('/config/membership-fee/update', { amount: parseFloat(fee) });
      alert(`${t('admin.membership_fee')} updated ✅`);
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      {/* Membership Fee */}
      <div className="detail-section">
        <h3>{t('admin.membership_fee')}</h3>
        <div className="form-group" style={{ marginTop: 12 }}>
          <div className="input-group">
            <span className="input-group__prefix">₹</span>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              min={0}
            />
          </div>
        </div>
        <button className="btn btn--primary btn--full" onClick={handleSaveFee} disabled={saving}>
          {saving ? '...' : t('profile.save')}
        </button>
      </div>

      {/* All Configs */}
      <div className="detail-section">
        <h3>{t('admin.config')}</h3>
        {Object.entries(configs).map(([key, val]) => (
          <div key={key} className="detail-row">
            <span className="detail-row__label">{val.label || key}</span>
            <span className="detail-row__value">{val.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
