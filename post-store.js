(function () {
  'use strict';
  const KEY = 'misamo.prototype.v1';
  const USER = Object.freeze({ id: 'demo-me', name: 'misamo_korea', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' });
  const copy = value => JSON.parse(JSON.stringify(value));
  function cleanVideo(video) {
    if (video == null) return null;
    let media = typeof window !== 'undefined' ? window.MisamoVideo : null;
    if (!media && typeof require === 'function') {
      try { media = require('./video-media.js'); } catch (_) { /* Report a user-facing load error below. */ }
    }
    if (typeof media?.cleanVideo !== 'function') throw new Error('동영상 처리 기능을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
    const cleaned = media.cleanVideo(video);
    if (!cleaned) throw new Error('첨부 동영상 형식, 용량 또는 화면 비율을 확인해주세요.');
    return cleaned;
  }
  function createMisamoStore(storage) {
    function read() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return { version: 1, draft: null, posts: [], threads: {}, likes: {} };
        const state = JSON.parse(raw);
        if (state.version !== 1 || !Array.isArray(state.posts) || !state.threads || !state.likes) throw new Error();
        return state;
      } catch (_) { throw new Error('브라우저에 저장된 내용을 읽을 수 없습니다. 브라우저 저장 설정을 확인해주세요.'); }
    }
    function write(state) {
      try { storage.setItem(KEY, JSON.stringify(state)); }
      catch (_) { throw new Error('저장 공간이 부족하거나 브라우저 저장이 차단됐습니다. 저장 공간과 브라우저 설정을 확인한 뒤 다시 저장해주세요.'); }
    }
    function cleanDraft(draft) {
      const images = Array.isArray(draft.images) ? copy(draft.images) : [];
      if (images.length > 3 || images.some(img => typeof img.src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(img.src))) throw new Error('사진은 JPG, PNG, WebP 형식으로 최대 3장까지 첨부해주세요.');
      if (images.reduce((sum, img) => sum + img.src.length, 0) > 1800000) throw new Error('사진 용량이 너무 큽니다. 작은 사진으로 다시 첨부해주세요.');
      const tags = [...new Set((Array.isArray(draft.tags) ? draft.tags : []).map(tag => String(tag).trim().replace(/^#+/, '')).filter(Boolean))];
      if (tags.length > 10) throw new Error('태그는 최대 10개까지 입력해주세요.');
      return {
        title: String(draft.title || ''), bodyText: String(draft.bodyText || ''), bodyHtml: String(draft.bodyHtml || ''),
        type: String(draft.type ?? ''), category: String(draft.category ?? ''), industry: String(draft.industry || ''),
        tags, images, video: cleanVideo(draft.video),
        autoTags: Array.isArray(draft.autoTags) ? [...new Set(draft.autoTags.filter(tag => tags.includes(tag)))].slice(0,10) : [],
        excludedAutoTags: Array.isArray(draft.excludedAutoTags) ? [...new Set(draft.excludedAutoTags.filter(tag => typeof tag === 'string' && tag.length <= 30))].slice(0,1000) : [],
        mediaOrder: Array.isArray(draft.mediaOrder) ? [...new Set(draft.mediaOrder.filter(k => typeof k === 'string' && k.length < 150))].slice(0,4) : [],
        mediaRatio: draft.mediaRatio === '4:5' ? '4:3' : ['4:3','1:1','9:16','16:9'].includes(draft.mediaRatio) ? draft.mediaRatio : (cleanVideo(draft.video)?.ratio || '4:3'),
        mediaLayout: ['carousel','inline'].includes(draft.mediaLayout) ? draft.mediaLayout : '', coverId: draft.coverId || images[0]?.id || null, visibility: 'local',
      };
    }
    return {
      USER,
      getBookmarkFolders() { return copy(read().bookmarkFolders || []); },
      getBookmarkAssignments() { return copy(read().bookmarkAssignments || {}); },
      createBookmarkFolder(name) {
        name = String(name || '').trim();
        if (!name || name.length > 30) throw new Error('폴더 이름을 1~30자로 입력해주세요.');
        const state = read();
        const folders = state.bookmarkFolders || [];
        if (folders.some(folder => folder.name === name)) throw new Error('같은 이름의 폴더가 있습니다.');
        const folder = { id: crypto.randomUUID(), name };
        state.bookmarkFolders = [...folders, folder]; write(state); return copy(folder);
      },
      assignBookmarkFolder(id, folderId) {
        const state = read();
        if (!(state.bookmarks || []).includes(id)) throw new Error('먼저 게시글을 저장해주세요.');
        if (folderId && !(state.bookmarkFolders || []).some(folder => folder.id === folderId)) throw new Error('폴더를 찾을 수 없습니다.');
        state.bookmarkAssignments = { ...(state.bookmarkAssignments || {}), [id]: folderId };
        write(state);
      },
      getBookmarks() {
        const bookmarks = read().bookmarks;
        return Array.isArray(bookmarks) ? [...new Set(bookmarks.filter(id => typeof id === 'string' && id))] : [];
      },
      toggleBookmark(id) {
        if (typeof id !== 'string' || !id) throw new Error('저장할 게시글을 찾을 수 없습니다.');
        const state = read();
        const bookmarks = new Set(Array.isArray(state.bookmarks) ? state.bookmarks.filter(value => typeof value === 'string' && value) : []);
        const saved = !bookmarks.has(id);
        if (saved) bookmarks.add(id); else bookmarks.delete(id);
        if (!saved && state.bookmarkAssignments) delete state.bookmarkAssignments[id];
        state.bookmarks = [...bookmarks];
        write(state);
        return saved;
      },
      readDraft() { return copy(read().draft); },
      saveDraft(draft) { const state = read(); const saved = { ...cleanDraft(draft), savedAt: new Date().toISOString() }; state.draft = saved; write(state); return copy(saved); },
      clearDraft() { const state = read(); state.draft = null; write(state); },
      getPosts() { return copy(read().posts); },
      publish(draft) {
        const data = cleanDraft(draft); data.title = data.title.trim(); data.bodyText = data.bodyText.trim();
        if (!data.title || data.title.length > 100) throw new Error('제목을 1~100자로 입력해주세요.');
        if (!data.bodyText || data.bodyText.length > 20000 || data.bodyHtml.length > 100000) throw new Error('본문을 1~20,000자로 입력해주세요.');
        const state = read();
        const post = { ...data, id: crypto.randomUUID(), authorId: USER.id, author: USER.name, avatar: USER.avatar, createdAt: new Date().toISOString() };
        state.posts.unshift(post); state.draft = null; write(state); return copy(post);
      },
      readComments(id) { return copy(read().threads[id] || null); },
      saveComments(id, thread) { const state = read(); state.threads[id] = copy(thread); write(state); return copy(thread); },
      getPostLike(id) { return copy(read().likes[id] || { liked: false, count: id === 'demo-cafe' ? 124 : 0 }); },
      setPostLike(id, liked) {
        const state = read(); const next = { liked: Boolean(liked), count: (id === 'demo-cafe' ? 124 : 0) + (liked ? 1 : 0) };
        state.likes[id] = next; write(state); return copy(next);
      },
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createMisamoStore };
  if (typeof window !== 'undefined') {
    // Access localStorage lazily so a browser permission error is handled by the UI.
    window.MisamoStore = createMisamoStore({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) });
  }
})();
