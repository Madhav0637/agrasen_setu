import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';
import { HiDocument, HiPlus, HiDotsVertical, HiTrash } from 'react-icons/hi';
import { formatFullTimestamp } from '../utils/formatters';
import Avatar from '../components/common/Avatar';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Posts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { user } = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'POST' });
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const res = await api.get('/posts', { params: { authorId: user?.id } });
      setPosts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.content || form.content.trim() === '') {
      return alert('Post description is mandatory.');
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      formData.append('type', form.type);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setForm({ title: '', content: '', type: 'POST' });
      setFiles([]);
      setShowForm(false);
      loadPosts();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create post');
    } finally {
      setProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!postToDelete) return;
    try {
      await api.delete(`/posts/${postToDelete}`);
      loadPosts();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete post');
    }
  };

  const triggerDeleteConfirm = (postId) => {
    setActiveMenuId(null);
    setPostToDelete(postId);
    setDeleteModalOpen(true);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      alert('You can only upload up to 5 files per post.');
      return;
    }
    setFiles(selectedFiles);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Post"
        message="Are you sure you want to permanently destroy this post? It cannot be recovered."
        confirmText="Delete Post"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDanger={true}
      />

      {/* Top Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {hasPermission('CREATE_POSTS') && !showForm && (
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setShowForm(true)}>
            + {t('posts.create')}
          </button>
        )}
        {hasPermission('CREATE_POLLS') && !showForm && (
          <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => navigate('/polls')}>
             <HiPlus style={{ verticalAlign: 'middle', marginRight: '4px' }}/> 
             Create Poll
          </button>
        )}
      </div>

      {showForm && (
        <form className="card create-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>{t('posts.post_title')}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea 
               value={form.content} 
               onChange={(e) => setForm({ ...form, content: e.target.value })} 
               required 
               rows={4} 
               placeholder="Write post description here..." 
            />
          </div>
          <div className="form-group">
            <label>{t('posts.type')}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="POST">Post</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select>
          </div>
          <div className="form-group">
            <label>Attachments (Max 5)</label>
            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              style={{ padding: '8px', background: 'var(--color-bg-input)', borderRadius: '8px', border: '1px solid var(--color-border)', width: '100%', color: 'var(--color-text)' }}
            />
            {files.length > 0 && <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{files.length} file(s) selected</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: '16px' }}>
            <button type="submit" className="btn btn--primary btn--full" disabled={processing}>
              {processing ? 'Creating...' : t('posts.submit')}
            </button>
            <button type="button" className="btn btn--outline btn--full" onClick={() => setShowForm(false)} disabled={processing}>
              {t('common.close')}
            </button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📝</div>
          <div className="empty-state__text">{t('home.no_posts')}</div>
        </div>
      ) : (
        posts.map((post) => {
          const canDelete = post.author?.id === user?.id || hasPermission('MANAGE_POSTS');
          const isMenuOpen = activeMenuId === post.id;

          return (
            <div key={post.id} className={`post-card ${post.isPinned ? 'post-card--pinned' : ''}`}>
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
                  
                  {/* Action Dropdown Menu */}
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
                            <button className="dropdown-item dropdown-item--danger" onClick={() => triggerDeleteConfirm(post.id)}>
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
              
              {/* Attachments rendering */}
              {post.attachments && post.attachments.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {post.attachments.map((att) => (
                    <div key={att.id}>
                      {att.type === 'IMAGE' ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={att.url} 
                            alt={att.fileName} 
                            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--color-border)', objectFit: 'cover' }} 
                          />
                        </a>
                      ) : (
                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--color-bg-secondary)', borderRadius: '8px', color: 'var(--color-primary)', textDecoration: 'none', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                        >
                          <HiDocument size={20} />
                          <span style={{ wordBreak: 'break-all' }}>{att.fileName}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
