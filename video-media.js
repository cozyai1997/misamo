(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) root.MisamoVideo = api;
})(typeof window === 'object' ? window : globalThis, function (root) {
  'use strict';

  const MAX_BYTES = 100 * 1024 * 1024;
  const RATIOS = Object.freeze(['4:3', '1:1', '9:16', '16:9']);
  const MIME_TYPES = ['video/mp4', 'video/webm'];
  const DB_NAME = 'misamo.media.v1';
  const figures = new WeakMap();
  const active = new Set();
  let databasePromise = null, lifecycleStarted = false, intersection = null;

  function cleanVideo(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const { id, source, name, mime, size, width, height, duration } = value;
    // Keep existing attachments readable when retiring the old landscape preset.
    const ratio = value.ratio === '1.91:1' ? '16:9' : value.ratio === '4:5' ? '4:3' : value.ratio;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
    if (!['indexeddb', 'asset'].includes(source) || !MIME_TYPES.includes(mime)) return null;
    if (typeof name !== 'string' || !name.trim() || name.length > 240 || /[\u0000-\u001f\u007f]/.test(name)) return null;
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BYTES) return null;
    if (![width, height, duration].every(number => typeof number === 'number' && Number.isFinite(number) && number > 0)) return null;
    if (!RATIOS.includes(ratio)) return null;
    const record = { id, source, name:name.trim(), mime, size, width, height, duration, ratio };
    if (source === 'asset') {
      if (typeof value.src !== 'string' || !/^assets\/local-test-media\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}\.(mp4|webm)$/.test(value.src) || value.src.includes('..')) return null;
      if (!value.src.endsWith(mime === 'video/mp4' ? '.mp4' : '.webm')) return null;
      record.src = value.src;
    } else if (value.src != null && value.src !== '') return null;
    return record;
  }

  function storageError(error) {
    if (error?.name === 'QuotaExceededError') return new Error('동영상을 저장할 브라우저 저장 공간이 부족합니다. 더 작은 파일을 선택해주세요.');
    if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') return new Error('이 브라우저에서 동영상 저장소를 사용할 수 없습니다. 브라우저의 사이트 저장 설정을 확인해주세요.');
    return new Error('동영상을 브라우저에 저장하거나 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  function openDatabase() {
    if (!root.indexedDB) return Promise.reject(new Error('이 브라우저는 동영상 저장을 지원하지 않습니다. 다른 브라우저를 사용해주세요.'));
    if (databasePromise) return databasePromise;
    const opening = new Promise((resolve, reject) => {
      let request, settled = false;
      const timer = root.setTimeout(() => finish(new Error('동영상 저장소를 여는 데 시간이 오래 걸립니다. 다른 미사모 탭을 닫고 다시 시도해주세요.')), 10000);
      function finish(error, database) {
        if (settled) { database?.close(); return; }
        settled = true; root.clearTimeout(timer);
        if (error) reject(error); else resolve(database);
      }
      try {
        request = root.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('videos')) request.result.createObjectStore('videos', {keyPath:'id'});
        };
        request.onerror = () => finish(storageError(request.error));
        request.onblocked = () => finish(new Error('다른 미사모 탭이 동영상 저장소를 사용하고 있습니다. 해당 탭을 닫고 다시 시도해주세요.'));
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => { database.close(); databasePromise = null; };
          finish(null, database);
        };
      } catch (error) { finish(storageError(error)); }
    });
    databasePromise = opening;
    opening.catch(() => { if (databasePromise === opening) databasePromise = null; });
    return opening;
  }

  async function storeBlob(id, blob) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      try {
        const transaction = database.transaction('videos', 'readwrite');
        let requestError = null;
        transaction.oncomplete = () => resolve();
        transaction.onerror = event => { requestError = event?.target?.error || transaction.error; };
        transaction.onabort = () => reject(storageError(requestError || transaction.error));
        transaction.objectStore('videos').put({id, blob});
      } catch (error) { reject(storageError(error)); }
    });
  }

  async function readBlob(record) {
    const database = await openDatabase();
    const row = await new Promise((resolve, reject) => {
      let result;
      try {
        const transaction = database.transaction('videos', 'readonly');
        let requestError = null;
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = event => { requestError = event?.target?.error || transaction.error; };
        transaction.onabort = () => reject(storageError(requestError || transaction.error));
        const request = transaction.objectStore('videos').get(record.id);
        request.onsuccess = () => { result = request.result; };
      } catch (error) { reject(storageError(error)); }
    });
    if (!(row?.blob instanceof root.Blob) || row.blob.size !== record.size || row.blob.type !== record.mime) {
      throw new Error('저장된 동영상을 찾을 수 없습니다. 이 브라우저에서 원본 파일을 다시 첨부해주세요.');
    }
    return row.blob;
  }

  async function assertAvailable(value) {
    const record = cleanVideo(value);
    if (!record) throw new Error('동영상 정보가 올바르지 않습니다. 파일을 다시 첨부해주세요.');
    if (record.source === 'indexeddb') await readBlob(record);
    else {
      const controller = new root.AbortController();
      const timer = root.setTimeout(() => controller.abort(), 10000);
      try {
        const url = new root.URL(record.src, root.location.href);
        const response = await root.fetch(url.href, {method:'HEAD', signal:controller.signal, redirect:'error', cache:'no-store'});
        if (!response.ok) throw new Error('동영상 파일을 찾을 수 없습니다. 파일이 있는지 확인하거나 원본을 다시 첨부해주세요.');
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('동영상 파일 확인 시간이 초과되었습니다. 연결 상태를 확인하고 다시 시도해주세요.');
        if (error.message?.includes('동영상 파일을 찾을 수 없습니다')) throw error;
        throw new Error('동영상 파일을 확인할 수 없습니다. 연결 상태를 확인하고 다시 시도해주세요.');
      } finally { root.clearTimeout(timer); }
    }
    return record;
  }

  function pause(video) { try { video.pause(); } catch (_) {} }
  function clearMedia(video) {
    pause(video);
    video.removeAttribute('src');
    try { video.load(); } catch (_) {}
  }

  function inspectFile(file) {
    return new Promise((resolve, reject) => {
      const video = root.document.createElement('video');
      let url = null, metadata = null, settled = false;
      const timer = root.setTimeout(() => finish(new Error('동영상 확인 시간이 초과되었습니다. 더 짧거나 작은 MP4 또는 WebM 파일로 다시 시도해주세요.')), 25000);
      function finish(error) {
        if (settled) return;
        settled = true; root.clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onMetadata);
        video.removeEventListener('loadeddata', onDecoded);
        video.removeEventListener('error', onError);
        clearMedia(video);
        if (url) root.URL.revokeObjectURL(url);
        if (error) reject(error); else resolve(metadata);
      }
      function onMetadata() {
        const {videoWidth:width, videoHeight:height, duration} = video;
        if (![width, height, duration].every(number => Number.isFinite(number) && number > 0)) {
          finish(new Error('동영상의 길이 또는 화면 크기를 읽을 수 없습니다. 정상적인 MP4 또는 WebM 파일을 선택해주세요.'));
          return;
        }
        metadata = {width, height, duration};
      }
      function onDecoded() {
        onMetadata();
        if (!settled && metadata) finish();
      }
      function onError() { finish(new Error('이 동영상을 재생할 수 없습니다. 손상된 파일인지 확인하거나 지원되는 코덱의 MP4 또는 WebM 파일을 선택해주세요.')); }
      try {
        if (!video.canPlayType(file.type)) { onError(); return; }
        // A decoded first frame catches containers whose metadata exists but codec is unsupported.
        video.preload = 'auto'; video.muted = true; video.playsInline = true;
        video.addEventListener('loadedmetadata', onMetadata);
        video.addEventListener('loadeddata', onDecoded);
        video.addEventListener('error', onError);
        url = root.URL.createObjectURL(file); video.src = url; video.load();
      } catch (_) { finish(new Error('동영상을 확인할 수 없습니다. 브라우저를 새로고침한 뒤 다시 시도해주세요.')); }
    });
  }

  async function importFile(file) {
    if (!(file instanceof root.Blob) || !MIME_TYPES.includes(file.type)) throw new Error('MP4 또는 WebM 동영상 파일을 선택해주세요.');
    if (!file.size) throw new Error('비어 있는 동영상은 첨부할 수 없습니다.');
    if (file.size > MAX_BYTES) throw new Error('동영상은 파일당 100MB까지 첨부할 수 있습니다.');
    if (!root.document || !root.URL?.createObjectURL) throw new Error('이 환경에서는 동영상을 첨부할 수 없습니다. 웹 브라우저에서 다시 시도해주세요.');
    const measured = await inspectFile(file);
    const id = root.crypto?.randomUUID ? root.crypto.randomUUID() : `video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const name = String(file.name || (file.type === 'video/mp4' ? '동영상.mp4' : '동영상.webm')).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240) || '동영상';
    const record = cleanVideo({id, source:'indexeddb', name, mime:file.type, size:file.size, ...measured, ratio:'4:3'});
    if (!record) throw new Error('동영상 정보를 확인하지 못했습니다. 다른 파일을 선택해주세요.');
    await storeBlob(record.id, file);
    return record;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60), remainder = String(total % 60).padStart(2, '0');
    return minutes < 60 ? `${minutes}:${remainder}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
  }

  function updateCaption(state) {
    const {record} = state;
    state.caption.textContent = `${record.name} · ${formatDuration(record.duration)} · ${record.ratio}`;
  }

  function setRatio(figure, ratio) {
    if (!RATIOS.includes(ratio)) throw new Error('지원하지 않는 동영상 화면 비율입니다.');
    const state = figures.get(figure);
    if (!state) return;
    state.record = {...state.record, ratio};
    state.frame.style.aspectRatio = ratio.replace(':', ' / ');
    figure.dataset.videoRatio = ratio;
    updateCaption(state);
  }

  function pauseWithin(container) {
    if (container?.matches?.('video')) pause(container);
    container?.querySelectorAll?.('.misamo-video video').forEach(pause);
  }

  function dispose(state) {
    if (state.disposed) return;
    state.disposed = true; state.generation += 1;
    root.clearTimeout(state.loadTimer);
    clearMedia(state.video);
    if (state.url) root.URL.revokeObjectURL(state.url);
    state.url = null;
    intersection?.unobserve(state.figure);
    active.delete(state);
  }

  function release(container = root.document) {
    if (figures.has(container)) dispose(figures.get(container));
    container?.querySelectorAll?.('.misamo-video').forEach(figure => { const state = figures.get(figure); if (state) dispose(state); });
    pauseWithin(container);
  }

  async function loadFigure(state) {
    if (state.disposed || !state.figure.isConnected) return;
    const generation = ++state.generation;
    root.clearTimeout(state.loadTimer);
    clearMedia(state.video);
    if (state.url) root.URL.revokeObjectURL(state.url);
    state.url = null; state.video.hidden = false;
    state.figure.removeAttribute('data-video-error');
    state.figure.setAttribute('aria-busy', 'true');
    state.status.hidden = true; state.retry.hidden = true;
    state.loadTimer = root.setTimeout(() => {
      if (state.disposed || generation !== state.generation) return;
      state.generation += 1;
      clearMedia(state.video);
      if (state.url) root.URL.revokeObjectURL(state.url);
      state.url = null;
      showError(state, '동영상 불러오기 시간이 초과되었습니다. 연결 상태를 확인하고 다시 불러와주세요.');
    }, 15000);
    try {
      let url = state.record.src;
      if (state.record.source === 'indexeddb') {
        const blob = await readBlob(state.record);
        if (state.disposed || generation !== state.generation || !state.figure.isConnected) return;
        url = root.URL.createObjectURL(blob); state.url = url;
      }
      if (state.disposed || generation !== state.generation || !state.figure.isConnected) return;
      state.video.src = url;
      state.video.load();
    } catch (error) { if (!state.disposed && generation === state.generation) showError(state, error.message); }
  }

  function showError(state, message) {
    if (state.disposed) return;
    root.clearTimeout(state.loadTimer);
    state.figure.removeAttribute('aria-busy');
    state.figure.dataset.videoError = 'true';
    state.message.textContent = message;
    state.status.hidden = false; state.retry.hidden = false;
    pause(state.video);
  }

  function activate(figure) {
    const state = figures.get(figure);
    if (!state || state.disposed || active.has(state) || !figure.isConnected) return;
    active.add(state); intersection?.observe(figure); loadFigure(state);
  }

  function startLifecycle() {
    if (lifecycleStarted) return;
    lifecycleStarted = true;
    const doc = root.document;
    if (root.IntersectionObserver) intersection = new root.IntersectionObserver(entries => {
      entries.forEach(entry => { if (!entry.isIntersecting) { const state = figures.get(entry.target); if (state) pause(state.video); } });
    }, {threshold:0});
    if (root.MutationObserver) new root.MutationObserver(records => {
      active.forEach(state => { if (!state.figure.isConnected) dispose(state); });
      records.forEach(record => {
        if (record.type === 'attributes') {
          if (record.target.hidden || (record.target.tagName === 'DIALOG' && !record.target.open)) pauseWithin(record.target);
          return;
        }
        record.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches('.misamo-video')) activate(node);
          node.querySelectorAll('.misamo-video').forEach(activate);
        });
      });
    }).observe(doc.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden', 'open']});
    doc.addEventListener('play', event => {
      if (!event.target.matches?.('.misamo-video video')) return;
      active.forEach(state => { if (state.video !== event.target) pause(state.video); });
      if (doc.hidden || event.target.closest('dialog:not([open]), [hidden]')) pause(event.target);
    }, true);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) active.forEach(state => pause(state.video)); });
    doc.addEventListener('close', event => pauseWithin(event.target), true);
    root.addEventListener('misamo:view', () => active.forEach(state => pause(state.video)));
    root.addEventListener('pagehide', () => active.forEach(state => pause(state.video)));
  }

  function createFigure(value) {
    const record = cleanVideo(value);
    if (!record) throw new Error('동영상 정보가 올바르지 않습니다. 파일을 다시 첨부해주세요.');
    startLifecycle();
    const doc = root.document, figure = doc.createElement('figure'), frame = doc.createElement('div');
    const video = doc.createElement('video'), caption = doc.createElement('figcaption');
    const status = doc.createElement('div'), message = doc.createElement('p'), retry = doc.createElement('button');
    figure.className = 'misamo-video'; figure.dataset.videoId = record.id;
    frame.className = 'misamo-video-frame';
    video.controls = true; video.playsInline = true; video.preload = 'metadata';
    Object.assign(video.style, {objectFit:'cover', objectPosition:'center', width:'100%', height:'100%'});
    video.setAttribute('aria-label', `동영상: ${record.name}`);
    status.className = 'misamo-video-status'; status.hidden = true;
    message.setAttribute('role', 'status');
    retry.type = 'button'; retry.textContent = '다시 불러오기'; retry.hidden = true;
    status.append(message, retry); frame.append(video); figure.append(frame, caption, status);
    const state = {figure, frame, video, caption, status, message, retry, record, url:null, generation:0, disposed:false, loadTimer:null};
    figures.set(figure, state);
    setRatio(figure, record.ratio);
    retry.addEventListener('click', () => loadFigure(state));
    video.addEventListener('loadedmetadata', () => {
      if (!state.disposed) { root.clearTimeout(state.loadTimer); figure.removeAttribute('aria-busy'); status.hidden = true; }
    });
    video.addEventListener('durationchange', () => {
      if (!state.disposed && Number.isFinite(video.duration) && video.duration > 0) {
        state.record = {...state.record, duration:video.duration}; updateCaption(state);
      }
    });
    video.addEventListener('error', () => { if (!state.disposed && video.hasAttribute('src')) showError(state, '동영상을 재생할 수 없습니다. 파일이 없거나 이 브라우저에서 지원하지 않는 코덱일 수 있습니다.'); });
    // No Blob URL is allocated until mounted. Detached, unused preview nodes need no cleanup.
    root.queueMicrotask(() => activate(figure));
    return figure;
  }

  return Object.freeze({MAX_BYTES, RATIOS, cleanVideo, importFile, createFigure, setRatio, release, assertAvailable, formatDuration});
});
