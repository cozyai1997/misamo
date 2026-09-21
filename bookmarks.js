(function () {
  'use strict';
  const store = window.MisamoStore;
  const list = document.querySelector('[data-bookmark-list]');
  if (!store || !list) return;
  let category = '전체', folderId = '', tag = '', sort = 'latest', layout = 'grid';
  const categories = ['전체', '창업 정보', '커뮤니티 글', '자료실', '전문가', '세미나·모임'];
  const sources = () => [...new Map([...document.querySelectorAll('.post-card[data-post-id], .recommend-card[data-post-id]')].filter(n => !window.MisamoCommunity || window.MisamoCommunity.post(n.dataset.postId)).map(n => [n.dataset.postId, n])).values()];
  const node = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const icon = name => { const element = node('i'); element.dataset.lucide = name; return element; };
  function button(className, text, action) {
    const element = node('button', className, text); element.type = 'button';
    if (action) element.addEventListener('click', action);
    return element;
  }
  function display(button, saved) {
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? '저장 해제' : '저장');
    button.title = saved ? '저장 해제' : '저장';
    button.classList.toggle('is-bookmarked', saved);
  }
  function describe(source) {
    const id = source.dataset.postId;
    const title = source.querySelector('h2, h3')?.textContent || '저장한 게시글';
    const label = source.querySelector(':scope > span')?.textContent.trim();
    const group = id.startsWith('recommend-') ? (id === 'recommend-cost' ? '자료실' : (label?.includes('전문가') ? '전문가' : '창업 정보')) : (id === 'demo-cafe' ? '창업 정보' : '커뮤니티 글');
    return { id, source, title, group, label: label || group,
      image: source.querySelector('.post-image, .post-rich-body img, :scope > img'),
      author: source.querySelector('.post-head strong, .recommend-author small')?.textContent || '미사모',
      avatar: source.querySelector('.post-head img, .recommend-author img'),
      date: source.querySelector('.post-head small')?.textContent || '',
      excerpt: source.querySelector('.post-copy p, :scope > p')?.textContent.trim() || '',
      tags: [...source.querySelectorAll('.tags span')].map(item => item.textContent.trim()),
      likes: source.querySelector('[data-like-count], footer > span')?.textContent.trim() || '0',
      comments: source.querySelector('[data-comments-count]')?.textContent.trim() || '' };
  }
  function openSource(item) {
    if (window.MisamoCommunityUI) return window.MisamoCommunityUI.openPost(item.id);
    window.misamoNavigate(item.source.closest('[data-page]').dataset.page);
    item.source.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item.source.querySelector('[data-bookmark-button]')?.focus({ preventScroll: true });
  }
  function card(item, folders, assignments) {
    const article = node('article', 'saved-content-card');
    const media = button('saved-card-media', undefined, () => openSource(item));
    media.setAttribute('aria-label', item.title);
    if (item.image) { const image = node('img'); image.src = item.image.src; image.alt = ''; image.loading = 'lazy'; media.append(image); }
    else media.append(icon('file-text'));
    media.append(node('span', 'saved-category-label', item.label));
    const remove = button('saved-card-bookmark');
    remove.dataset.bookmarkButton = ''; remove.dataset.bookmarkId = item.id;
    remove.append(icon('bookmark')); display(remove, true);
    const body = node('div', 'saved-card-body');
    const heading = node('h2'); heading.append(button('bookmark-open', item.title, () => openSource(item)));
    body.append(heading, node('p', 'saved-card-excerpt', item.excerpt));
    const meta = node('div', 'saved-card-meta');
    if (item.avatar) { const image = node('img'); image.src = item.avatar.src; image.alt = ''; meta.append(image); }
    meta.append(node('span', '', item.author), node('small', '', item.date));
    const metrics = node('div', 'saved-card-metrics');
    const likes = node('span'); likes.append(icon('heart'), document.createTextNode(item.likes)); metrics.append(likes);
    if (item.comments) { const comments = node('span'); comments.append(icon('message-circle'), document.createTextNode(item.comments)); metrics.append(comments); }
    body.append(meta, metrics);
    if (folders.length) {
      const select = node('select', 'saved-card-folder'); select.setAttribute('aria-label', `${item.title} 저장 폴더`);
      const unfiled = node('option', '', '폴더 미지정'); unfiled.value = ''; select.append(unfiled);
      folders.forEach(folder => { const option = node('option', '', folder.name); option.value = folder.id; select.append(option); });
      select.value = assignments[item.id] || '';
      select.addEventListener('change', () => { try { store.assignBookmarkFolder(item.id, select.value); refresh(); } catch (error) { select.value = assignments[item.id] || ''; window.alert(error.message); } });
      body.append(select);
    }
    article.append(media, remove, body); return article;
  }
  function refresh() {
    const ids = store.getBookmarks(), saved = new Set(ids), folders = store.getBookmarkFolders(), assignments = store.getBookmarkAssignments();
    document.querySelectorAll('[data-bookmark-button]').forEach(button => display(button, saved.has(button.dataset.bookmarkId || button.closest('[data-post-id]')?.dataset.postId)));
    const all = sources().map(describe);
    const items = ids.map(id => all.find(item => item.id === id)).filter(Boolean);
    const filters = document.querySelector('[data-saved-filters]'); filters.replaceChildren();
    categories.forEach(name => {
      const count = items.filter(item => name === '전체' || item.group === name).length;
      const filter = button('saved-filter', name, () => { category = name; refresh(); });
      filter.append(node('span', '', String(count))); filter.setAttribute('aria-pressed', String(category === name)); filters.append(filter);
    });
    let visible = items.filter(item => (category === '전체' || item.group === category) && (!folderId || assignments[item.id] === folderId) && (!tag || item.tags.includes(tag)));
    if (sort === 'latest') visible.reverse();
    if (sort === 'title') visible.sort((a,b) => a.title.localeCompare(b.title, 'ko'));
    list.dataset.layout = layout;
    list.replaceChildren(...visible.map(item => card(item, folders, assignments)));
    if (!visible.length) {
      const empty = node('div', 'bookmark-empty'); empty.append(icon('bookmark'), node('h2', '', items.length ? '조건에 맞는 콘텐츠가 없습니다' : '다시 보고 싶은 글을 저장해보세요'), node('p', '', '게시글의 북마크 버튼을 누르면 이곳에 모아볼 수 있어요.'));
      empty.append(button('saved-create', items.length ? '전체 저장 콘텐츠 보기' : '콘텐츠 둘러보기', () => { if (items.length) { category = '전체'; folderId = ''; tag = ''; refresh(); } else window.misamoNavigate('explore'); })); list.append(empty);
    }
    document.querySelector('[data-saved-context]').textContent = [folders.find(folder => folder.id === folderId)?.name, tag].filter(Boolean).join(' · ');
    const folderList = document.querySelector('[data-saved-folders]'); folderList.replaceChildren();
    [{ id: '', name: '전체 저장 콘텐츠' }, ...folders].forEach(folder => {
      const entry = button('saved-folder', undefined, () => { folderId = folder.id; category = '전체'; tag = ''; refresh(); });
      entry.dataset.folderFilter = folder.id; entry.setAttribute('aria-pressed', String(folderId === folder.id));
      entry.append(icon(folder.id ? 'folder' : 'folder-heart'), node('span', '', folder.name), node('small', '', String(items.filter(item => !folder.id || assignments[item.id] === folder.id).length))); folderList.append(entry);
    });
    const tags = document.querySelector('[data-saved-tags]'); tags.replaceChildren();
    [...new Set(items.slice().reverse().flatMap(item => item.tags))].slice(0,10).forEach(name => {
      const entry = button('saved-tag', name, () => { tag = tag === name ? '' : name; refresh(); }); entry.setAttribute('aria-pressed', String(tag === name)); tags.append(entry);
    });
    if (!tags.childElementCount) tags.append(node('p', 'saved-side-empty', '태그가 있는 글을 저장하면 표시됩니다.'));
    const suggestions = document.querySelector('[data-saved-suggestions]'); suggestions.replaceChildren();
    all.filter(item => !saved.has(item.id)).slice(0,3).forEach(item => {
      const entry = button('saved-suggestion', undefined, () => openSource(item));
      if (item.image) { const image = node('img'); image.src = item.image.src; image.alt = ''; entry.append(image); }
      entry.append(node('span', '', item.title)); suggestions.append(entry);
    });
    if (!suggestions.childElementCount) suggestions.append(node('p', 'saved-side-empty', '현재 콘텐츠를 모두 저장했어요.'));
    window.createMisamoIcons?.();
  }
  function safelyRefresh() { try { refresh(); } catch (_) { list.textContent = '저장한 글을 불러오지 못했습니다. 브라우저 저장 설정을 확인해주세요.'; } }
  const folderDialog = document.querySelector('[data-folder-dialog]');
  const folderInput = document.querySelector('[data-folder-name]');
  const folderError = document.querySelector('[data-folder-error]');
  document.querySelectorAll('[data-folder-create]').forEach(element => element.addEventListener('click', () => {
    folderInput.value = ''; folderError.textContent = ''; folderDialog.showModal(); folderInput.focus();
  }));
  document.querySelector('[data-folder-cancel]').addEventListener('click', () => folderDialog.close());
  document.querySelector('[data-folder-form]').addEventListener('submit', event => {
    event.preventDefault();
    try { store.createBookmarkFolder(folderInput.value); refresh(); folderDialog.close(); }
    catch (error) { folderError.textContent = error.message; }
  });
  document.querySelector('[data-saved-sort]').addEventListener('change', event => { sort = event.target.value; safelyRefresh(); });
  document.querySelectorAll('[data-saved-view]').forEach(element => element.addEventListener('click', () => {
    layout = element.dataset.savedView;
    document.querySelectorAll('[data-saved-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.savedView === layout)));
    list.dataset.layout = layout;
  }));
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-bookmark-button]'); if (!button) return;
    event.preventDefault();
    const id = button.dataset.bookmarkId || button.closest('[data-post-id]')?.dataset.postId;
    try { store.toggleBookmark(id); refresh(); } catch (error) { window.alert(error.message); }
  });
  window.addEventListener('storage', event => { if (event.key === 'misamo.prototype.v1' || event.key === null) safelyRefresh(); });
  window.addEventListener('misamo:view', safelyRefresh);
  window.addEventListener('misamo:post-rendered', safelyRefresh);
  window.addEventListener('misamo:community-change', safelyRefresh);
  safelyRefresh();
})();
