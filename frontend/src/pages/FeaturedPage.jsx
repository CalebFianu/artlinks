import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { I, cls } from '../components/Icons';
import Sidebar from '../components/Sidebar';
import LinkModal from '../components/LinkModal';
import FeaturedPickerModal from '../components/FeaturedPickerModal';
import Toast from '../components/Toast';
import { useLinks } from '../hooks/useLinks';
import { useCollections } from '../hooks/useCollections';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { isFeatured, linkCollection, collectionEmoji } from '../utils/models';

const SLOTS = 8;

export default function FeaturedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { links, addLink, updateLink, deleteLink, toggleFeatured, reorderLinks } = useLinks(user?.username);
  const { collections } = useCollections();
  const { toast, showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const featured = links.filter(isFeatured);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = featured.findIndex((l) => l.id === active.id);
    const newIndex = featured.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(featured, oldIndex, newIndex);
    try {
      await reorderLinks(reordered.map((l) => l.id));
    } catch {
      showToast('Failed to save order.');
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      await toggleFeatured(id);
    } catch (e) {
      showToast(e.response?.data?.category?.[0] || 'Could not update.');
    }
  };

  const handleSaveAdd = async (payload) => {
    try {
      await addLink(payload);
      setShowAdd(false);
      showToast('Link added ✓');
    } catch (e) {
      showToast(e.response?.data?.category?.[0] || 'Failed to add link.');
    }
  };

  const handleSaveEdit = async (payload) => {
    try {
      await updateLink(editingLink.id, payload);
      setEditingLink(null);
      showToast('Saved ✓');
    } catch {
      showToast('Failed to save.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLink(id);
      setEditingLink(null);
      showToast('Deleted');
    } catch {
      showToast('Failed to delete.');
    }
  };

  return (
    <div className="app">
      <div className={cls('sidebar-backdrop', sidebarOpen && 'open')} onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        <div className="mobile-topbar">
          <button onClick={() => setSidebarOpen((o) => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: 'var(--ink)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="brand" style={{ fontFamily: 'var(--font-display)', fontSize: 22, cursor: 'pointer' }} onClick={() => navigate('/')}><span className="dot" />artlinks</div>
          <div />
        </div>

        <main className="main">
          <header className="page-header">
            <div className="page-title-group">
              <div className="page-eyebrow">artlinks / Featured</div>
              <h1>
                Featured{' '}
                <span className="hand" style={{ color: 'var(--accent-ink)', fontSize: '0.5em', marginLeft: 6, verticalAlign: 'middle' }}>
                  (on your profile)
                </span>
              </h1>
              <div className="page-subtitle">
                The links that show up on your public page, in this exact order.
                Up to {SLOTS} featured links allowed.
              </div>
            </div>
          </header>

          <div className="featured-stage">
            <div>
              <div className="section-hd" style={{ marginTop: 0 }}>
                <h2>Stage · {featured.length}/{SLOTS}</h2>
                <div className="muted">tap star to add/remove</div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={featured.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="featured-slots">
                    {Array.from({ length: SLOTS }).map((_, i) => {
                      const link = featured[i];
                      if (!link) {
                        return (
                          <div
                            key={'e' + i}
                            className="slot empty"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowPicker(true)}
                          >
                            <span className="hand" style={{ fontSize: 18, color: 'var(--ink-mute)' }}>
                              + add a featured link to slot {i + 1}
                            </span>
                          </div>
                        );
                      }
                      const col = linkCollection(link, collections);
                      const emoji = col ? collectionEmoji(col.id) : '◇';
                      return (
                        <SortableFeaturedSlot
                          key={link.id}
                          link={link}
                          index={i}
                          col={col}
                          emoji={emoji}
                          onEdit={() => setEditingLink(link)}
                          onUnfeature={() => handleToggleFeatured(link.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="preview-phone">
              <ProfileMini links={links} user={user} />
            </div>
          </div>
        </main>

        <nav className="mobile-bottom-nav">
          {[
            { path: '/dashboard', label: 'Links', icon: I.link },
            { path: '/collections', label: 'Collections', icon: I.folder },
            { path: '/featured', label: 'Featured', icon: I.star },
            { path: '/daily', label: 'Daily', icon: I.book },
            { path: user ? `/${user.username}` : '/login', label: 'Profile', icon: I.eye },
          ].map((it) => (
            <button key={it.path} className={cls('mbn-item', location.pathname === it.path && 'active')} onClick={() => navigate(it.path)}>
              <it.icon size={18} />
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {showPicker && (
        <FeaturedPickerModal
          links={links}
          onClose={() => setShowPicker(false)}
          onFeature={handleToggleFeatured}
          onAddNew={() => setShowAdd(true)}
        />
      )}
      {showAdd && (
        <LinkModal
          mode="add"
          collections={collections}
          defaultFeatured
          onClose={() => setShowAdd(false)}
          onSave={handleSaveAdd}
        />
      )}
      {editingLink && (
        <LinkModal
          mode="edit" link={editingLink} collections={collections}
          onClose={() => setEditingLink(null)}
          onSave={handleSaveEdit}
          onDelete={() => handleDelete(editingLink.id)}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}

function SortableFeaturedSlot({ link, index, col, emoji, onEdit, onUnfeature }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="slot"
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div className="slot-num">{index + 1}</div>
      <div>
        <div style={{ fontWeight: 500 }}>{link.title}</div>
        <div className="link-url">
          {link.url} · <span className="text-mute">{col ? `${emoji} ${col.name}` : '—'}</span>
        </div>
      </div>
      <div className="row" style={{ gap: 2 }}>
        <button className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={onEdit}><I.edit size={15} /></button>
        <button className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={onUnfeature} title="Unfeature"><I.x size={15} /></button>
      </div>
    </div>
  );
}

function ProfileMini({ links, user }) {
  const featured = links.filter(isFeatured);
  const initial = user?.username?.[0]?.toUpperCase() || 'A';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, margin: '0 auto 10px', borderRadius: '50%', border: 'var(--stroke) solid var(--ink)', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', fontFamily: 'var(--font-display)', fontSize: 28 }}>
        {initial}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1 }}>{user?.username || 'you'}</div>
      <div className="mono text-mute" style={{ fontSize: 10, margin: '4px 0 10px' }}>@{user?.username}</div>
      <div className="col" style={{ gap: 8 }}>
        {featured.map((l, i) => (
          <div key={l.id} style={{
            padding: '10px 12px',
            border: 'var(--stroke) solid var(--ink)',
            borderRadius: 10,
            fontSize: 11,
            background: i === 0 ? 'var(--accent)' : 'var(--paper)',
            fontWeight: 500,
            textAlign: 'left',
          }}>
            {l.title}
          </div>
        ))}
      </div>
    </div>
  );
}
