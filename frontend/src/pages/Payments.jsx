import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Payments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      try {
        const [payRes, planRes] = await Promise.all([
          api.get('/payments/me'),
          api.get('/payments/plans'),
        ]);
        setPayments(payRes.data || []);
        setPlans(planRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentYearPaid = payments.some((p) => p.membershipYear === currentYear && p.status === 'PAID');
  const plan = plans[0];
  const amount = plan ? parseFloat(plan.amount) : 1000;

  const handlePay = async () => {
    if (!plan) return;
    try {
      const res = await api.post('/payments/create-order', { planId: plan.id, membershipYear: currentYear });
      const { orderId, keyId } = res.data;

      const options = {
        key: keyId,
        amount: res.data.amount,
        currency: 'INR',
        name: t('app_name'),
        order_id: orderId,
        handler: async (response) => {
          await api.post('/payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          const payRes = await api.get('/payments/me');
          setPayments(payRes.data || []);
        },
        prefill: { contact: user?.phone },
        theme: { color: '#6366f1' },
      };

      if (window.Razorpay) {
        new window.Razorpay(options).open();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      {/* Status Card */}
      <div className={`payment-status ${currentYearPaid ? 'payment-status--paid' : 'payment-status--pending'}`}>
        <div className="payment-status__icon">{currentYearPaid ? '✅' : '⏳'}</div>
        <div className="payment-status__info">
          <div className="payment-status__title">
            {currentYear} — {currentYearPaid ? t('payments.paid') : t('payments.pending')}
          </div>
          <div className="payment-status__amount">₹{amount.toLocaleString('en-IN')}</div>
        </div>
        {!currentYearPaid && (
          <button className="btn btn--primary btn--sm" onClick={handlePay}>
            {t('payments.pay_now')}
          </button>
        )}
      </div>

      {/* Payment History */}
      <h3 className="section-title">{t('payments.history')}</h3>
      <div className="detail-section">
        {payments.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{t('payments.no_history')}</p>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="payment-row">
              <div>
                <div className="payment-row__year">{p.membershipYear}</div>
                <div className="payment-row__amount">₹{parseFloat(p.amount).toLocaleString('en-IN')}</div>
              </div>
              <span className={`badge badge--${p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : 'danger'}`}>
                {p.status === 'PAID' ? t('payments.paid') : t('payments.pending')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
