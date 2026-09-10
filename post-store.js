(function () {
  'use strict';
  const KEY = 'misamo.prototype.v1';
  const USER = Object.freeze({ id: 'demo-me', name: 'misamo_korea', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' });
  const copy = value => JSON.parse(JSON.stringify(value));
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
      catch (_) { throw new Error('저장 공간이 부족하거나 브라우저 저장이 차단됐습니다. 사진 크기를 줄인 뒤 다시 저장해주세요.'); }
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
        tags, images, coverId: draft.coverId || images[0]?.id || null, visibility: 'local',
      };
    }
    return {
      USER,
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
