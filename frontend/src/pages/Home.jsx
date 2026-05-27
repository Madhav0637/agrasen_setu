import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { formatFullTimestamp } from '../utils/formatters';
import { HiDocument, HiDotsVertical, HiTrash } from 'react-icons/hi';
import Avatar from '../components/common/Avatar';
import ConfirmModal from '../components/common/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [votingPollId, setVotingPollId] = useState(null);

  const loadData = useCallback(async (isBackground = false) => {
    try {
      const [postsRes, pollsRes] = await Promise.all([
        api.get('/posts?limit=10'),
        api.get('/polls?limit=5'),
      ]);
      setPosts(postsRes.data.data || []);
      setPolls(pollsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const intervalId = setInterval(() => loadData(true), 3000);
    return () => clearInterval(intervalId);
  }, [loadData]);

  const handleVote = async (pollId, optionId) => {
    setVotingPollId(pollId);
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      await loadData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setVotingPollId(null);
    }
  };

  const triggerDeleteConfirm = (id, type) => {
    setActiveMenuId(null);
    setItemToDelete({ id, type });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'post') {
        await api.delete(`/posts/${itemToDelete.id}`);
      } else {
        await api.delete(`/polls/${itemToDelete.id}`);
      }
      loadData(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const pinned = posts.filter((p) => p.isPinned);
  const regular = posts.filter((p) => !p.isPinned);

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {attachments.map((att) => (
          <div key={att.id}>
            {att.type === 'IMAGE' ? (
              <a href={att.url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={att.url} alt={att.fileName || 'Attachment'} 
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--color-border)', objectFit: 'cover' }} 
                />
              </a>
            ) : (
              <a 
                href={att.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--color-surface)', borderRadius: '8px', color: 'var(--color-primary)', textDecoration: 'none', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
              >
                <HiDocument size={20} />
                <span style={{ wordBreak: 'break-all' }}>{att.fileName}</span>
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPostCard = (post, isPinned) => {
    const canDelete = post.author?.id === user?.id || hasPermission('MANAGE_POSTS');
    const isMenuOpen = activeMenuId === post.id;

    return (
      <div key={post.id} className={`post-card ${isPinned ? 'post-card--pinned' : ''}`}>
        <div className="post-card__header">
          <div className="post-card__author">
            <Avatar src={post.author?.profilePictureUrl} name={post.author?.name} size="sm" />
            <div className="post-card__author-info">
              <span className="post-card__author-name">{post.author?.name}</span>
              <span className="post-card__time" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {formatFullTimestamp(post.createdAt)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {post.type === 'ANNOUNCEMENT' && <span className="badge badge--warning">{t('home.announcement')}</span>}
            
            {canDelete && (
                <div className="dropdown-container">
                  <button 
                    onClick={() => setActiveMenuId(isMenuOpen ? null : post.id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    <HiDotsVertical size={20} />
                  </button>
                  {isMenuOpen && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item dropdown-item--danger" onClick={() => triggerDeleteConfirm(post.id, 'post')}>
                        <HiTrash size={16} /> Delete Post
                      </button>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
        <div className="post-card__title">{post.title}</div>
        <div className="post-card__content">{post.content}</div>
        {renderAttachments(post.attachments)}
      </div>
    );
  };

  return (
    <div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${itemToDelete?.type === 'post' ? 'Post' : 'Poll'}`}
        message={`Are you sure you want to permanently delete this ${itemToDelete?.type}? It cannot be undone.`}
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDanger={true}
      />

      {pinned.length > 0 && (
        <>
          <h3 className="section-title">📌 {t('home.pinned')}</h3>
          {pinned.map((p) => renderPostCard(p, true))}
        </>
      )}

      <h3 className="section-title">{t('home.recent_posts')}</h3>
      {regular.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">📝</div>
          <div className="empty-state__text">{t('home.no_posts')}</div>
        </div>
      )}
      {regular.map((p) => renderPostCard(p, false))}

      {polls.length > 0 && (
        <>
          <h3 className="section-title">📊 {t('home.active_polls')}</h3>
          {polls.filter((p) => p.isActive).map((poll) => {
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
                          <button className="dropdown-item dropdown-item--danger" onClick={() => triggerDeleteConfirm(poll.id, 'poll')}>
                            <HiTrash size={16} /> Delete Poll
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="poll-card__meta" style={{ marginTop: '8px' }}>{totalVotes} {t('home.votes')}</div>

                {/* Vote Loading Spinner */}
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
                        {/* Transparent poll: show who voted */}
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
          })}
        </>
      )}
    </div>
  );
}
