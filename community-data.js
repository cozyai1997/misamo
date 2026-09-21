(function () {
  'use strict';
  const KEY = 'misamo.community.v1';
  const store = window.MisamoStore;
  const originalGetPosts = store.getPosts.bind(store);
  const copy = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const uid = () => window.crypto.randomUUID();
  const me = { id: 'demo-me', name: store.USER.name, avatar: store.USER.avatar, bio: '창업과 성장 이야기를 나눕니다.', industry: '', category: '' };
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const empty = () => ({ version: 1, following: [], favorites: [], hidden: [], snoozed: {}, blocked: [], subscriptions: [], reports: [], messages: [], activity: [], deleted: [], edits: {}, profile: {}, registrations: [] });
  const idLists = ['following', 'favorites', 'hidden', 'blocked', 'subscriptions', 'deleted'];
  function read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return empty();
      const s = JSON.parse(raw);
      if (!object(s) || s.version !== 1 || idLists.some(k => !Array.isArray(s[k]) || s[k].some(v => typeof v !== 'string')) ||
        ['reports', 'messages', 'activity', 'registrations'].some(k => !Array.isArray(s[k]) || s[k].some(v => !object(v) || typeof v.id !== 'string')) ||
        ['snoozed', 'edits', 'profile'].some(k => !object(s[k])) || Object.values(s.snoozed).some(v => typeof v !== 'string' || !Number.isFinite(Date.parse(v))) ||
        Object.values(s.edits).some(v => !object(v))) throw new Error('schema');
      return s;
    } catch (_) { throw new Error('브라우저에 저장된 커뮤니티 내용을 읽을 수 없습니다. 저장 설정을 확인해주세요.'); }
  }
  function change(kind, id, fn, label) {
    const s = read();
    const result = fn(s);
    if (label) s.activity.unshift({ id: uid(), text: label, postId: kind.includes('post') || kind === 'subscription' ? id : '', read: false, createdAt: now() });
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (_) { throw new Error('브라우저 저장에 실패했습니다. 저장 공간과 설정을 확인해주세요.'); }
    window.dispatchEvent(new CustomEvent('misamo:community-change', { detail: { kind, id } }));
    return result;
  }
  const knownProfiles = new Map([[me.id, me], ['misamo-official', { id: 'misamo-official', name: 'misamo_official', avatar: '', bio: '미사모 창업 자료 안내', industry: '서비스', category: '창업 준비' }], ['expert-tax', { id: 'expert-tax', name: '미사모 세무 전문가', avatar: '', bio: '세무 상담 안내 프로필', industry: '서비스', category: '자금·세무' }], ['expert-marketing', { id: 'expert-marketing', name: '미사모 마케팅 전문가', avatar: '', bio: '마케팅 상담 안내 프로필', industry: '서비스', category: '마케팅' }]]);
  function normalize(p, authored = false) {
    const authorId = p.authorId || (authored ? me.id : String(p.author || 'misamo_official').replaceAll('_', '-'));
    return { ...p, id: String(p.id), title: String(p.title || ''), bodyText: String(p.bodyText || ''), bodyHtml: String(p.bodyHtml || ''), authorId, author: p.author || (authorId === me.id ? me.name : authorId), avatar: p.avatar || '', createdAt: p.createdAt || '2026-09-01T00:00:00.000Z', category: p.category || '', type: p.type || '', industry: p.industry || '', tags: Array.isArray(p.tags) ? copy(p.tags) : [], images: Array.isArray(p.images) ? copy(p.images) : [] };
  }
  // Capture reference cards once, before menus and other UI add their own text.
  const fallback = Array.from(document.querySelectorAll('.post-card[data-post-id], .recommend-card[data-post-id]'), card => {
    const id = card.dataset.postId;
    const body = card.querySelector('.post-copy > p, :scope > p');
    const name = card.querySelector('.post-head strong, .recommend-author small')?.textContent.trim();
    const tags = Array.from(card.querySelectorAll('.tags span'), n => n.textContent.trim().replace(/^#/, ''));
    const category = id.includes('support') ? '정부지원' : id.includes('marketing') ? '마케팅' : id.includes('cost') ? '자금·세무' : '창업 준비';
    const p = normalize({ id, title: card.querySelector('h2,h3')?.textContent.trim(), authorId: card.dataset.authorId, author: name, avatar: card.querySelector('.post-head img, .recommend-author img')?.getAttribute('src'), bodyText: body?.textContent.trim(), bodyHtml: body?.outerHTML || '', category, industry: id.includes('support') ? '기타' : '외식·카페', type: card.querySelector(':scope > span')?.textContent.trim() || '경험 나눔', tags, resource: id === 'recommend-cost', images: Array.from(card.querySelectorAll('.post-image, :scope > img'), (img, i) => ({ id: `${id}-image-${i}`, src: img.getAttribute('src'), alt: img.alt })) });
    return p;
  });
  function remember(p) {
    if (!knownProfiles.has(p.authorId)) knownProfiles.set(p.authorId, { id: p.authorId, name: p.author, avatar: p.avatar, bio: '미사모 커뮤니티 회원', industry: p.industry, category: p.category });
  }
  fallback.forEach(remember);
  function sources() {
    const byId = new Map(fallback.map(p => [p.id, p]));
    originalGetPosts().forEach(p => { const n = normalize(p, true); remember(n); byId.set(n.id, n); });
    return Array.from(byId.values());
  }
  function apply(p, s) {
    const edit = s.edits[p.id] || {};
    const result = { ...p, ...edit, id: p.id, authorId: p.authorId };
    if (p.authorId === me.id) { result.author = s.profile.name || me.name; result.avatar = s.profile.avatar ?? me.avatar; }
    return result;
  }
  function posts({ includeHidden = false } = {}) {
    const s = read();
    return copy(sources().filter(p => !s.deleted.includes(p.id) && (includeHidden || (!s.hidden.includes(p.id) && !s.blocked.includes(p.authorId) && !(Date.parse(s.snoozed[p.authorId]) > Date.now())))).map(p => apply(p, s)));
  }
  const post = id => posts({ includeHidden: true }).find(p => p.id === id) || null;
  function profiles() { sources(); const s = read(); return copy(Array.from(knownProfiles.values(), p => p.id === me.id ? { ...me, ...s.profile, id: me.id } : p)); }
  const profile = id => profiles().find(p => p.id === id) || null;
  function requirePost(id, deleted = false) { const p = deleted ? sources().find(p => p.id === id) : post(id); if (!p) throw new Error('게시글을 찾을 수 없습니다.'); return p; }
  function requireAuthor(id) { if (!profile(id)) throw new Error('회원을 찾을 수 없습니다.'); }
  function owned(id, deleted = false) { const p = requirePost(id, deleted); if (p.authorId !== me.id) throw new Error('본인 게시글만 수정하거나 삭제할 수 있습니다.'); return p; }
  function toggle(field, kind, id, label, author = true) {
    if (author) requireAuthor(id); else requirePost(id);
    return change(kind, id, s => { const yes = !s[field].includes(id); s[field] = yes ? [...s[field], id] : s[field].filter(v => v !== id); return yes; }, label);
  }
  function setList(field, kind, id, enabled, label) { return change(kind, id, s => { s[field] = s[field].filter(v => v !== id); if (enabled) s[field].push(id); return enabled; }, label); }
  const api = {
    posts, post, profiles, profile, state: () => copy(read()),
    toggleFollow(id) { return toggle('following', 'follow', id, '팔로우 설정을 변경했습니다.'); },
    toggleFavorite(id) { return toggle('favorites', 'favorite', id, '관심 회원 설정을 변경했습니다.'); },
    hidePost(id) { requirePost(id); return setList('hidden', 'hide-post', id, true, '게시글을 내 화면에서 숨겼습니다.'); },
    restorePost(id) { return setList('hidden', 'restore-post', id, false); },
    snoozeAuthor(id, days = 30) { requireAuthor(id); if (!Number.isFinite(days) || days <= 0 || days > 3650) throw new Error('숨김 기간을 확인해주세요.'); return change('snooze', id, s => s.snoozed[id] = new Date(Date.now() + days * 86400000).toISOString(), '회원의 글을 내 화면에서 잠시 숨겼습니다.'); },
    unsnoozeAuthor(id) { return change('unsnooze', id, s => { delete s.snoozed[id]; return true; }); },
    blockAuthor(id) { requireAuthor(id); if (id === me.id) throw new Error('본인은 차단할 수 없습니다.'); return setList('blocked', 'block', id, true, '회원의 글을 내 화면에서 차단했습니다.'); },
    unblockAuthor(id) { return setList('blocked', 'unblock', id, false); },
    toggleSubscription(id) { return toggle('subscriptions', 'subscription', id, '게시글 구독 설정을 이 브라우저에 저장했습니다.', false); },
    reportPost(id, reason) { requirePost(id); const text = String(reason || '').trim(); if (!text || text.length > 2000) throw new Error('신고 사유를 1~2,000자로 입력해주세요.'); return change('report-post', id, s => { const r = { id: uid(), postId: id, reason: text, createdAt: now() }; s.reports.unshift(r); return copy(r); }, '신고 사유를 이 브라우저에 기록했습니다. 운영자에게 전송되지 않았습니다.'); },
    updatePost(id, fields) {
      const p = owned(id); const edit = {};
      for (const key of ['title', 'bodyText', 'type', 'category', 'industry']) if (Object.hasOwn(fields, key)) edit[key] = String(fields[key] ?? '').trim();
      if (Object.hasOwn(fields, 'bodyHtml')) {
        edit.bodyHtml = window.MisamoContent.sanitizeHtml(String(fields.bodyHtml));
        if (!Object.hasOwn(fields, 'bodyText')) { const holder = document.createElement('div'); holder.innerHTML = edit.bodyHtml; edit.bodyText = holder.textContent.trim(); }
      }
      if (Object.hasOwn(fields, 'tags')) { if (!Array.isArray(fields.tags)) throw new Error('태그 형식을 확인해주세요.'); edit.tags = [...new Set(fields.tags.map(t => String(t).trim().replace(/^#+/, '')).filter(Boolean))]; if (edit.tags.length > 10) throw new Error('태그는 최대 10개입니다.'); }
      // Existing attachment records remain intact unless the editor explicitly supplies a replacement set.
      if (Object.hasOwn(fields, 'images')) {
        if (!Array.isArray(fields.images) || fields.images.length > 3 || fields.images.some(img => !object(img) || typeof img.id !== 'string' || typeof img.src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(img.src)) || fields.images.reduce((n, img) => n + img.src.length, 0) > 1800000) throw new Error('첨부 사진 형식 또는 용량을 확인해주세요.');
        edit.images = copy(fields.images);
      }
      if (Object.hasOwn(fields, 'video')) {
        if (fields.video === null) edit.video = null;
        else {
          if (typeof window.MisamoVideo?.cleanVideo !== 'function') throw new Error('동영상 처리 기능을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
          edit.video = window.MisamoVideo.cleanVideo(fields.video);
          if (!edit.video) throw new Error('첨부 동영상 형식, 용량 또는 화면 비율을 확인해주세요.');
        }
      }
      for (const key of ['autoTags','excludedAutoTags']) {
        if (Object.hasOwn(fields,key)) edit[key] = Array.isArray(fields[key]) ? [...new Set(fields[key].filter(tag => typeof tag === 'string' && tag.length <= 30))].slice(0,key === 'autoTags' ? 10 : 1000) : [];
      }
      if (Object.hasOwn(fields, 'mediaOrder')) edit.mediaOrder = Array.isArray(fields.mediaOrder) ? [...new Set(fields.mediaOrder.filter(k => typeof k === 'string' && k.length < 150))].slice(0,4) : [];
      if (Object.hasOwn(fields, 'mediaRatio')) edit.mediaRatio = ['4:3','1:1','9:16','16:9'].includes(fields.mediaRatio) ? fields.mediaRatio : '4:3';
      if (Object.hasOwn(fields, 'mediaLayout')) edit.mediaLayout = ['carousel','inline'].includes(fields.mediaLayout) ? fields.mediaLayout : '';
      if (Object.hasOwn(fields, 'coverId')) edit.coverId = fields.coverId;
      const result = { ...p, ...edit };
      if (!result.title || result.title.length > 100 || !result.bodyText || result.bodyText.length > 20000 || result.bodyHtml.length > 100000) throw new Error('제목과 본문 길이를 확인해주세요.');
      return change('edit-post', id, s => { s.edits[id] = { ...(s.edits[id] || {}), ...edit, updatedAt: now() }; return copy({ ...result, updatedAt: s.edits[id].updatedAt }); }, '내 게시글 수정을 이 브라우저에 저장했습니다.');
    },
    deletePost(id) { owned(id); return setList('deleted', 'delete-post', id, true, '내 게시글을 이 브라우저에서 삭제했습니다. 설정에서 복원할 수 있습니다.'); },
    restoreDeleted(id) { owned(id, true); return setList('deleted', 'restore-deleted-post', id, false); },
    updateProfile(fields) { const edit = {}; for (const key of ['name', 'bio', 'industry', 'category']) if (Object.hasOwn(fields, key)) edit[key] = String(fields[key] ?? '').trim(); if (edit.name !== undefined && (!edit.name || edit.name.length > 50)) throw new Error('이름을 1~50자로 입력해주세요.'); if ((edit.bio || '').length > 1000) throw new Error('소개는 1,000자 이내로 입력해주세요.'); return change('profile', me.id, s => { s.profile = { ...s.profile, ...edit }; return copy({ ...me, ...s.profile, id: me.id }); }, '내 프로필을 수정했습니다.'); },
    sendMessage(id, text, postId = '') { requireAuthor(id); text = String(text || '').trim(); if (!text || text.length > 5000) throw new Error('메시지를 1~5,000자로 입력해주세요.'); if (postId) requirePost(postId); return change('message', id, s => { const m = { id: uid(), recipientId: id, text, postId, createdAt: now() }; s.messages.unshift(m); return copy(m); }, '메시지를 로컬 보관함에 저장했습니다. 상대에게 전송되지 않았습니다.'); },
    markRead(id) { return change('read', id, s => { const a = s.activity.find(v => v.id === id); if (a) a.read = true; return !!a; }); },
    register(id, details = '') { if (typeof id !== 'string' || !id.trim()) throw new Error('서비스를 선택해주세요.'); details = String(details || '').trim(); if (details.length > 2000) throw new Error('신청 내용은 2,000자 이내로 입력해주세요.'); const previous = read().registrations.find(r => r.serviceId === id); if (previous) return copy(previous); return change('register', id, s => { const r = { id: uid(), serviceId: id, details, createdAt: now() }; s.registrations.unshift(r); return copy(r); }, '신청 내용을 이 브라우저에 기록했습니다. 실제 접수되지 않았습니다.'); },
    cancelRegistration(id) { return change('cancel-registration', id, s => { s.registrations = s.registrations.filter(r => r.serviceId !== id); return true; }, '로컬 신청 기록을 취소했습니다.'); },
  };
  // Keep store serialization, draft, comments and shared samples untouched.
  store.getPosts = () => { const s = read(); return originalGetPosts().filter(p => !s.deleted.includes(p.id)).map(p => copy(apply(normalize(p, true), s))); };
  window.MisamoCommunity = api;
})();
