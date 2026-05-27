import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiDotsVertical, HiTrash } from 'react-icons/hi';
import { formatFullTimestamp } from '../utils/formatters';
import Avatar from '../components/common/Avatar';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Polls() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { user } = useAuth();
  
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', options: ['', ''], isAnonymous: true });
  const [processing, setProcessing] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState(null);
  const [votingPollId, setVotingPollId] = useState(null);

  const loadPolls = useCallback(async (isBackground = false) => {
    try {
      const res = await api.get('/polls', { params: { authorId: user?.id } });
      setPolls(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPolls(false);
    const intervalId = setInterval(() => loadPolls(true), 3000);
    return () => clearInterval(intervalId);
  }, [loadPolls]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const validOptions = form.options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) return alert('Need at least 2 options.');
    
    setProcessing(true);
    try {
      await api.post('/polls', { 
        question: form.question, 
        options: validOptions,
        isAnonymous: form.isAnonymous
      });
      setForm({ question: '', options: ['', ''], isAnonymous: true });
      setShowForm(false);
      loadPolls(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create poll');
    } finally {
      setProcessing(false);
    }
  };

  const handleVote = async (pollId, optionId) => {
    setVotingPollId(pollId);
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      await loadPolls(true);
    } catch (err) {
      console.error(err);
    } finally {
      setVotingPollId(null);
    }
  };

  const handleOptionChange = (idx, val) => {
    const newOptions = [...form.options];
    newOptions[idx] = val;
    setForm({ ...form, options: newOptions });
  };
  const addOption = () => setForm({ ...form, options: [...form.options, ''] });
  const removeOption = (idx) => setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });

  const executeDelete = async () => {
    if (!pollToDelete) return;
    try {
      await api.delete(`/polls/${pollToDelete}`);
      loadPolls(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete poll');
    }
  };

  const triggerDeleteConfirm = (pollId) => {
    setActiveMenuId(null);
    setPollToDelete(pollId);
    setDeleteModalOpen(true);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Poll"
        message="Are you sure you want to permanently delete this poll? All votes and data will be erased."
        confirmText="Delete Poll"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDanger={true}
      />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {hasPermission('CREATE_POSTS') && !showForm && (
          <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => navigate('/posts')}>
             <HiPlus style={{ verticalAlign: 'middle', marginRight: '4px' }}/> 
             Create Post
          </button>
        )}
        {hasPermission('CREATE_POLLS') && !showForm && (
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setShowForm(true)}>
            + Create Poll
          </button>
        )}
      </div>

      {showForm && (
        <form className="card create-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>Poll Question</label>
            <input value={form.question} onChange={e => setForm({...form, question: e.target.value})} required placeholder="Ask your question..." />
          </div>
          <div className="form-group">
            <label>Options</label>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={opt} onChange={e => handleOptionChange(i, e.target.value)} placeholder={`Option ${i+1}`} required />
                {form.options.length > 2 && (
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => removeOption(i)} style={{ padding: '6px 10px' }}>✕</button>
                )}
              </div>
            ))}
            {form.options.length < 5 && (
              <button type="button" className="btn-link" style={{ padding: 0 }} onClick={addOption}>+ Add Option</button>
            )}
          </div>

          {/* Anonymous / Transparent Toggle */}
          <div className="toggle-row" style={{ borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
            <div className="toggle-row__label">
              <span className="toggle-row__title">
                {form.isAnonymous ? '🔒 Anonymous Poll' : '👁️ Transparent Poll'}
              </span>
              <span className="toggle-row__desc">
                {form.isAnonymous 
                  ? 'Votes are hidden — no one can see who voted for what' 
                  : 'Votes are public — everyone can see who selected which option'}
              </span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={!form.isAnonymous}
                onChange={e => setForm({ ...form, isAnonymous: !e.target.checked })}
              />
              <span className="toggle-switch__slider" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: '16px' }}>
            <button type="submit" className="btn btn--primary btn--full" disabled={processing}>
              {processing ? 'Creating...' : 'Launch Poll'}
            </button>
            <button type="button" className="btn btn--outline btn--full" onClick={() => setShowForm(false)} disabled={processing}>
              {t('common.close')}
            </button>
          </div>
        </form>
      )}

      {polls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__text">You haven't created any polls yet</div>
        </div>
      ) : (
        polls.map((poll) => {
          const totalVotes = poll.options?.reduce((sum, o) => sum + o.voteCount, 0) || 0;
          const canDelete = poll.createdBy?.id === user?.id || hasPermission('MANAGE_POLLS');
          const isMenuOpen = activeMenuId === poll.id;
          const isVoting = votingPollId === poll.id;

          return (
            <div key={poll.id} className="poll-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <Avatar src={poll.createdBy?.profilePictureUrl} name={poll.createdBy?.name} size="sm" style={{ marginTop: '2px' }} />
                  <div>
                    <div className="poll-card__question" style={{ marginBottom: 2 }}>{poll.question}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {formatFullTimestamp(poll.createdAt)} • By {poll.createdBy?.name}
                    </div>
                    {!poll.isAnonymous && (
                      <span className="badge badge--info" style={{ marginTop: 4, display: 'inline-block', fontSize: '0.65rem' }}>
                        👁️ Transparent Poll
                      </span>
                    )}
                  </div>
                </div>

                {canDelete && (
                  <div className="dropdown-container">
                    <button 
                      onClick={() => setActiveMenuId(isMenuOpen ? null : poll.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                    >
                      <HiDotsVertical size={20} />
                    </button>
                    {isMenuOpen && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item dropdown-item--danger" onClick={() => triggerDeleteConfirm(poll.id)}>
                          <HiTrash size={16} /> Delete Poll
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="poll-card__meta" style={{ marginTop: '8px' }}>{totalVotes} Votes</div>

              {isVoting && (
                <div className="vote-loading">
                  <div className="vote-spinner" />
                </div>
              )}

              <div className="poll-card__options">
                {poll.options?.map((opt) => {
                  const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                  return (
                    <div key={opt.id}>
                      <button
                        className={`poll-option ${poll.userVotedOptionId === opt.id ? 'poll-option--voted' : ''}`}
                        onClick={() => !poll.userVotedOptionId && !isVoting && handleVote(poll.id, opt.id)}
                        disabled={!!poll.userVotedOptionId || isVoting}
                      >
                        <div className="poll-option__bar" style={{ width: `${pct}%` }} />
                        <span className="poll-option__text">{opt.text}</span>
                        <span className="poll-option__percent">{pct}%</span>
                      </button>
                      {/* Transparent poll: show voters */}
                      {!poll.isAnonymous && opt.voters?.length > 0 && (
                        <div className="voter-list">
                          {opt.voters.map((v) => (
                            <span key={v.id} className="voter-chip">
                              {v.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
           );
        })
      )}
    </div>
  );
}
