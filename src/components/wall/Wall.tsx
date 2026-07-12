// components/wall/Wall.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Author = { firstName: string; lastName: string; avatarUrl: string | null };
type Post = {
  id: string; content: string; imageUrl: string | null;
  likeCount: number; replyCount: number; createdAt: string;
  parentId: string | null; isOwn: boolean; liked: boolean; author: Author;
};

export function Wall({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    setLoading(true); setError(null);
    try {
      const u = new URL('/api/wall/posts', window.location.origin);
      u.searchParams.set('eventId', eventId);
      if (!reset && cursor) u.searchParams.set('cursor', cursor);
      const res = await fetch(u);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao carregar'); return; }
      setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch { setError('Erro de conexão'); }
    finally { setLoading(false); }
  }, [eventId, cursor]);

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);

  function onPosted(newPost: Post) { setPosts(p => [newPost, ...p]); }
  function onDeleted(id: string) { setPosts(p => p.filter(x => x.id !== id)); }
  function onLikeChanged(id: string, liked: boolean, count: number) {
    setPosts(p => p.map(x => x.id === id ? { ...x, liked, likeCount: count } : x));
  }
  function onReplyAdded(parentId: string) {
    setPosts(p => p.map(x => x.id === parentId ? { ...x, replyCount: x.replyCount + 1 } : x));
  }

  return (
    <div className="space-y-6">
      <PostComposer eventId={eventId} onPosted={onPosted} placeholder={`Compartilhe algo sobre ${eventTitle}…`} />

      {error && <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-200">{error}</div>}

      <div className="space-y-3">
        {posts.length === 0 && !loading && (
          <div className="rounded-xl bg-surface-700 border border-muted-700 p-8 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-cream-300">Seja o primeiro a postar!</p>
          </div>
        )}
        {posts.map(p => (
          <PostCard key={p.id} post={p} eventId={eventId}
            onDeleted={onDeleted} onLikeChanged={onLikeChanged} onReplyAdded={onReplyAdded} />
        ))}
      </div>

      {hasMore && (
        <button type="button" onClick={() => load(false)} disabled={loading}
          className="w-full rounded-lg bg-surface-700 hover:bg-surface-500 disabled:opacity-50 text-cream-200 font-semibold py-2.5 transition">
          {loading ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}

// ====== Composer ======
function PostComposer({
  eventId, parentId, placeholder = 'Escreva algo…', onPosted, onCancel,
}: {
  eventId: string; parentId?: string; placeholder?: string;
  onPosted: (p: Post) => void; onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseFile(f: File | null) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr('Imagem maior que 5MB'); return; }
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)) { setErr('Formato não suportado'); return; }
    setErr(null);
    setImage({ file: f, preview: URL.createObjectURL(f) });
  }

  async function submit() {
    setErr(null);
    if (!text.trim() && !image) { setErr('Escreva algo ou adicione uma foto'); return; }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', image.file);
        fd.append('eventId', eventId);
        const upRes = await fetch('/api/wall/upload', { method: 'POST', body: fd });
        const up = await upRes.json();
        if (!upRes.ok) { setErr(up.error || 'Erro no upload'); setUploading(false); setPosting(false); return; }
        imageUrl = up.url;
        setUploading(false);
      }

      const res = await fetch('/api/wall/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, content: text.trim(), imageUrl, parentId }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Erro ao publicar'); return; }

      // Compõe o objeto post localmente (evita refetch)
      onPosted({
        id: data.id, content: text.trim(), imageUrl,
        likeCount: 0, replyCount: 0, createdAt: data.createdAt,
        parentId: parentId || null, isOwn: true, liked: false,
        author: { firstName: 'Você', lastName: '', avatarUrl: null },
      });

      setText(''); setImage(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally { setPosting(false); }
  }

  return (
    <div className="rounded-xl bg-surface-700 border border-muted-600 p-4">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={placeholder}
        rows={parentId ? 2 : 3} maxLength={2000}
        className="w-full bg-transparent text-cream-200 placeholder:text-cream-400 resize-none focus:outline-none" />
      {image && (
        <div className="relative inline-block mt-2">
          <img src={image.preview} alt="" className="max-h-40 rounded-lg" />
          <button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="absolute top-1 right-1 bg-surface-900/70 hover:bg-surface-900 text-cream-200 w-7 h-7 rounded-full text-sm">✕</button>
        </div>
      )}
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-muted-700">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={e => chooseFile(e.target.files?.[0] || null)} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-cream-400 hover:text-cream-200 text-sm flex items-center gap-1">📷 Foto</button>
          <span className="text-xs text-cream-400">{text.length}/2000</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-cream-400 hover:text-cream-200 text-sm px-3 py-1.5">Cancelar</button>
          )}
          <button type="button" onClick={submit} disabled={posting || (!text.trim() && !image)}
            className="rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-800 font-semibold text-sm px-5 py-1.5 transition">
            {posting ? (uploading ? 'Enviando foto…' : 'Publicando…') : (parentId ? 'Responder' : 'Publicar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== Post card ======
function PostCard({
  post, eventId, onDeleted, onLikeChanged, onReplyAdded,
}: {
  post: Post; eventId: string;
  onDeleted: (id: string) => void;
  onLikeChanged: (id: string, liked: boolean, count: number) => void;
  onReplyAdded: (parentId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showImg, setShowImg] = useState(false);

  async function toggleLike() {
    const action = post.liked ? 'unlike' : 'like';
    const optimisticCount = post.likeCount + (post.liked ? -1 : 1);
    onLikeChanged(post.id, !post.liked, optimisticCount);
    try {
      const res = await fetch('/api/wall/likes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, action }),
      });
      const data = await res.json();
      if (res.ok) onLikeChanged(post.id, action === 'like', data.likeCount);
      else onLikeChanged(post.id, post.liked, post.likeCount); // rollback
    } catch { onLikeChanged(post.id, post.liked, post.likeCount); }
  }

  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const u = new URL('/api/wall/posts', window.location.origin);
      u.searchParams.set('eventId', eventId);
      u.searchParams.set('parentId', post.id);
      const res = await fetch(u);
      const data = await res.json();
      if (res.ok) setReplies(data.posts);
    } finally { setLoadingReplies(false); }
  }

  function expand() {
    if (!showReplies && replies.length === 0) loadReplies();
    setShowReplies(s => !s);
  }

  async function deletePost() {
    if (!confirm('Apagar este post?')) return;
    const res = await fetch('/api/wall/posts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    });
    if (res.ok) onDeleted(post.id);
  }

  function onReplyPosted(reply: Post) {
    setReplies(r => [...r, reply]);
    setShowComposer(false);
    setShowReplies(true);
    onReplyAdded(post.id);
  }

  return (
    <article className="rounded-xl bg-surface-700 border border-muted-700 p-4">
      <div className="flex items-start gap-3">
        <Avatar author={post.author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-cream-200 text-sm">
              {post.author.firstName} {post.author.lastName}
            </span>
            <span className="text-xs text-cream-400">· {timeAgo(post.createdAt)}</span>
            {post.isOwn && (
              <button type="button" onClick={deletePost} title="Apagar"
                className="ml-auto text-cream-400 hover:text-red-400 text-xs">🗑</button>
            )}
          </div>
          {post.content.trim() && (
            <p className="mt-1 text-cream-200 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          )}
          {post.imageUrl && (
            <>
              <button type="button" onClick={() => setShowImg(true)}
                className="block mt-2 rounded-lg overflow-hidden border border-muted-700 hover:opacity-90 transition">
                <img src={post.imageUrl} alt="" className="max-h-96 w-auto" />
              </button>
              {showImg && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                  onClick={() => setShowImg(false)}>
                  <img src={post.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <button type="button" onClick={toggleLike}
              className={`flex items-center gap-1.5 transition ${post.liked ? 'text-red-500' : 'text-cream-400 hover:text-red-400'}`}>
              <span>{post.liked ? '❤️' : '🤍'}</span>
              <span>{post.likeCount}</span>
            </button>
            {!post.parentId && (
              <button type="button" onClick={() => setShowComposer(s => !s)}
                className="flex items-center gap-1.5 text-cream-400 hover:text-cream-200 transition">
                <span>💬</span>
                <span>Responder</span>
              </button>
            )}
            {post.replyCount > 0 && (
              <button type="button" onClick={expand} className="text-cream-400 hover:text-cream-200 transition">
                {showReplies ? '↑ ocultar' : `↓ ver ${post.replyCount} ${post.replyCount === 1 ? 'resposta' : 'respostas'}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {showComposer && (
        <div className="mt-3 ml-12">
          <PostComposer eventId={eventId} parentId={post.id} placeholder="Sua resposta…"
            onPosted={onReplyPosted} onCancel={() => setShowComposer(false)} />
        </div>
      )}

      {showReplies && (
        <div className="mt-3 ml-12 space-y-2 border-l-2 border-muted-700 pl-4">
          {loadingReplies && <p className="text-xs text-cream-400">Carregando…</p>}
          {replies.map(r => (
            <ReplyCard key={r.id} post={r} onLikeChanged={onLikeChanged} onDeleted={(id) => setReplies(rs => rs.filter(x => x.id !== id))} />
          ))}
        </div>
      )}
    </article>
  );
}

// ====== Reply card (versão mais simples) ======
function ReplyCard({
  post, onLikeChanged, onDeleted,
}: { post: Post; onLikeChanged: (id: string, liked: boolean, count: number) => void; onDeleted: (id: string) => void }) {
  async function toggleLike() {
    const action = post.liked ? 'unlike' : 'like';
    onLikeChanged(post.id, !post.liked, post.likeCount + (post.liked ? -1 : 1));
    const res = await fetch('/api/wall/likes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, action }),
    });
    const data = await res.json();
    if (res.ok) onLikeChanged(post.id, action === 'like', data.likeCount);
  }
  async function del() {
    if (!confirm('Apagar?')) return;
    const res = await fetch('/api/wall/posts', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ postId: post.id }) });
    if (res.ok) onDeleted(post.id);
  }
  return (
    <div className="flex items-start gap-2 py-2">
      <Avatar author={post.author} small />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-cream-200">{post.author.firstName} {post.author.lastName}</span>
          <span className="text-cream-400">· {timeAgo(post.createdAt)}</span>
          {post.isOwn && <button onClick={del} className="ml-auto text-cream-400 hover:text-red-400">🗑</button>}
        </div>
        {post.content.trim() && <p className="mt-0.5 text-cream-200 text-sm whitespace-pre-wrap break-words">{post.content}</p>}
        {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-1 max-h-48 rounded border border-muted-700" />}
        <button onClick={toggleLike} className={`mt-1 text-xs flex items-center gap-1 ${post.liked ? 'text-red-500' : 'text-cream-400 hover:text-red-400'}`}>
          {post.liked ? '❤️' : '🤍'} {post.likeCount}
        </button>
      </div>
    </div>
  );
}

// ====== Avatar ======
function Avatar({ author, small }: { author: Author; small?: boolean }) {
  const size = small ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  if (author.avatarUrl) {
    return <img src={author.avatarUrl} alt="" className={`${size} rounded-full object-cover bg-surface-700 shrink-0`} />;
  }
  const initial = (author.firstName[0] || '?').toUpperCase();
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-surface-600 to-muted-600 flex items-center justify-center text-cream-200 font-bold shrink-0`}>
      {initial}
    </div>
  );
}

// ====== Util ======
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
