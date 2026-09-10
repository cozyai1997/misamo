(function () {
  "use strict";

  const POST_TYPES = ["질문", "경험 나눔", "정보 공유", "성공 사례", "실패 사례", "지원사업", "기타"];
  const postContent = window.MisamoContent;
  if (!postContent) return;
  const MAX_IMAGES = 3;
  const MAX_IMAGE_BYTES = 1000000;
  const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
  const AUTOSAVE_DELAY = 700;

  const sanitizeHtml = postContent.sanitizeHtml;

  window.MisamoPostingSanitize = sanitizeHtml;

  const content = document.querySelector(".content");
  const rightRail = document.querySelector(".right-rail");
  if (!content || !rightRail || document.querySelector('[data-page="write"]')) return;

  const page = document.createElement("div");
  page.className = "page-view write-view";
  page.dataset.page = "write";
  page.setAttribute("aria-label", "새 글 작성 화면");
  page.innerHTML = `
    <section class="posting-panel">
      <header class="posting-header">
        <div class="posting-heading">
          <button class="posting-icon-button" type="button" data-write-back aria-label="홈으로 돌아가기"><i data-lucide="arrow-left"></i></button>
          <div><h1>새 글 작성</h1><p><span class="posting-save-dot" aria-hidden="true"></span><span data-draft-time>아직 저장되지 않음</span></p></div>
        </div>
        <div class="posting-header-actions">
          <button class="posting-secondary-button" type="button" data-preview-post><i data-lucide="eye"></i>미리보기</button>
          <button class="posting-secondary-button" type="button" data-save-draft><i data-lucide="save"></i>임시저장</button>
          <button class="posting-publish-button" type="button" data-publish-post>게시하기</button>
        </div>
      </header>

      <div class="posting-demo-notice" role="note"><i data-lucide="info"></i><span><strong>임시 버전</strong> · 이 브라우저에만 저장됩니다</span></div>

      <section class="posting-block" aria-labelledby="posting-type-title">
        <div class="posting-label-row"><h2 id="posting-type-title">글 유형</h2><span>하나를 선택해주세요</span></div>
        <div class="posting-type-list" data-post-types></div>
      </section>

      <section class="posting-block posting-editor-block" aria-labelledby="posting-content-title">
        <h2 id="posting-content-title">내용</h2>
        <label class="posting-title-field">
          <span class="sr-only">제목</span>
          <input type="text" maxlength="100" placeholder="제목을 입력해주세요" data-post-title />
          <small><b data-title-count>0</b>/100</small>
        </label>
        <div class="posting-toolbar" role="toolbar" aria-label="글자 꾸미기">
          <button type="button" data-editor-command="bold" aria-label="굵게"><strong>B</strong></button>
          <button type="button" data-editor-command="italic" aria-label="기울임"><em>I</em></button>
          <button type="button" data-editor-command="underline" aria-label="밑줄"><u>U</u></button>
          <span aria-hidden="true"></span>
          <button type="button" data-editor-command="insertUnorderedList" aria-label="글머리 기호"><i data-lucide="list"></i></button>
          <button type="button" data-editor-command="insertOrderedList" aria-label="번호 매기기"><i data-lucide="list-ordered"></i></button>
          <button type="button" data-editor-link aria-label="HTTPS 링크 추가"><i data-lucide="link"></i></button>
          <button type="button" class="posting-insert-image" data-editor-image aria-label="이미지 넣기"><i data-lucide="image-plus"></i><span>이미지 넣기</span></button>
          <span aria-hidden="true"></span>
          <button type="button" data-editor-align="left" aria-label="왼쪽 정렬"><i data-lucide="align-left"></i></button>
          <button type="button" data-editor-align="center" aria-label="가운데 정렬"><i data-lucide="align-center"></i></button>
          <button type="button" data-editor-align="right" aria-label="오른쪽 정렬"><i data-lucide="align-right"></i></button>
          <span aria-hidden="true"></span>
          <button type="button" data-editor-command="undo" aria-label="실행 취소"><i data-lucide="undo-2"></i></button>
          <button type="button" data-editor-command="redo" aria-label="다시 실행"><i data-lucide="redo-2"></i></button>
        </div>
        <div class="posting-editor-surface">
          <div class="posting-editor" contenteditable="true" role="textbox" aria-label="본문" aria-multiline="true" data-placeholder="내용을 입력하거나 사진을 여기에 끌어다 놓으세요." data-post-editor></div>
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden data-image-input />
        <p class="posting-image-hint">사진을 끌어 넣거나 이동하세요. 모서리로 크기 조절 · 선택 후 Delete로 삭제 · Ctrl+Z로 복원 <span data-image-total></span></p>
        <p class="posting-touch-hint">글을 길게 눌러 선택한 뒤, 양쪽 핸들로 범위를 조절하고 복사·붙여넣기하세요.</p>
      </section>

      <p class="posting-status" role="status" aria-live="polite" data-posting-status></p>
    </section>`;
  content.appendChild(page);

  const rail = document.createElement("div");
  rail.className = "rail-view write-rail";
  rail.dataset.rail = "write";
  rail.innerHTML = `
    <section class="posting-settings-card">
      <header><span><i data-lucide="sliders-horizontal"></i></span><div><h2>게시글 설정</h2><p>분류와 태그를 추가해보세요</p></div></header>
      <label class="posting-select-field"><span>카테고리</span><select data-post-category><option value="">선택 안 함</option><option>창업 준비</option><option>운영 노하우</option><option>마케팅</option><option>자금·세무</option><option>정부지원</option><option>네트워킹</option></select></label>
      <label class="posting-select-field"><span>업종</span><select data-post-industry><option value="">선택 안 함</option><option>외식·카페</option><option>소매·유통</option><option>온라인·플랫폼</option><option>서비스</option><option>교육</option><option>기타</option></select></label>
      <div class="posting-tag-field">
        <div class="posting-label-row"><label for="posting-tag-input">태그</label><small><b data-tag-count>0</b>/10</small></div>
        <div class="posting-tag-list" data-tag-list></div>
        <input id="posting-tag-input" type="text" maxlength="30" placeholder="태그 입력 후 Enter" data-tag-input />
      </div>
    </section>
    <section class="posting-settings-card posting-visibility-card">
      <header><span><i data-lucide="lock-keyhole"></i></span><div><h2>공개 범위</h2><p>임시 버전은 비공개만 지원합니다</p></div></header>
      <label><input type="radio" checked disabled /><span><strong>나만 보기</strong><small>이 브라우저에서만 확인 가능</small></span></label>
      <label class="is-disabled"><input type="radio" disabled /><span><strong>전체 공개</strong><small>실제 공유 기능 없음</small></span></label>
    </section>`;
  rightRail.appendChild(rail);

  const previewDialog = document.createElement("dialog");
  previewDialog.className = "posting-preview-dialog";
  previewDialog.setAttribute("aria-labelledby", "posting-preview-title");
  previewDialog.innerHTML = `
    <div class="posting-preview-shell">
      <header><div><small>게시 전 미리보기</small><h2 id="posting-preview-title">미리보기</h2></div><button type="button" data-preview-close aria-label="미리보기 닫기"><i data-lucide="x"></i></button></header>
      <div class="posting-preview-meta" data-preview-meta></div>
      <article><h1 data-preview-title></h1><div class="posting-preview-body" data-preview-body></div><div class="posting-preview-images" data-preview-images></div><div class="posting-preview-tags" data-preview-tags></div></article>
    </div>`;
  document.body.appendChild(previewDialog);

  const store = window.MisamoStore;
  const titleInput = page.querySelector("[data-post-title]");
  const titleCount = page.querySelector("[data-title-count]");
  const editor = page.querySelector("[data-post-editor]");
  const status = page.querySelector("[data-posting-status]");
  const draftTime = page.querySelector("[data-draft-time]");
  const categorySelect = rail.querySelector("[data-post-category]");
  const industrySelect = rail.querySelector("[data-post-industry]");
  const tagInput = rail.querySelector("[data-tag-input]");
  const tagList = rail.querySelector("[data-tag-list]");
  const tagCount = rail.querySelector("[data-tag-count]");
  const imageInput = page.querySelector("[data-image-input]");
  const inlineImageButton = page.querySelector("[data-editor-image]");
  const imageTotal = page.querySelector("[data-image-total]");
  const publishButton = page.querySelector("[data-publish-post]");
  let tags = [];
  let images = [];
  let coverId = "";
  let selectedType = "";
  let autosaveTimer = 0;
  let statusTimer = 0;
  let imageBusy = false;
  let savedEditorRange = null;
  let writingActive = window.location.hash === "#write";
  let editHistory = [], historyIndex = -1, restoringHistory = false, composing = false;
  let lastEditKind = '', lastEditTime = 0;
  const mediaEditor = window.createMisamoEditor({
    editor, toolbar: page.querySelector('.posting-toolbar'),
    onBeforeChange: () => recordEdit('boundary'),
    onChange: () => { rememberEditorRange(); renderImages(); recordEdit(); scheduleAutosave(); },
    onFiles: (files, range) => handleImageFiles(files, range),
    onDelete: (id) => {
      if(id.startsWith('card:')) {
        editor.querySelectorAll('a[data-card-id]').forEach(node=>{if(`card:${node.dataset.cardId}`===id) node.remove();});
        renderImages();recordEdit();scheduleAutosave();return;
      }
      editor.querySelectorAll('img[data-image-id]').forEach(node => { if(node.dataset.imageId === id) node.remove(); });
      images = images.filter(image => image.id !== id);
      if(coverId === id) coverId = images[0]?.id || '';
      renderImages(); recordEdit(); scheduleAutosave();
    },
  });

  function selectionBookmark() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    function path(node) {
      if(!editor.contains(node)) return null;
      const result=[];
      while(node && node!==editor) { result.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes,node));node=node.parentNode; }
      return node===editor ? result : null;
    }
    const start=path(range.startContainer),end=path(range.endContainer);
    return start && end ? {start,end,startOffset:range.startOffset,endOffset:range.endOffset} : null;
  }
  function editorSnapshot() {
    const draft=captureDraft();
    return {html:draft.bodyHtml,images:draft.images,coverId:draft.coverId,selection:selectionBookmark(),selectedId:mediaEditor.selectedId()};
  }
  function updateHistoryButtons() {
    page.querySelector('[data-editor-command="undo"]').disabled=imageBusy || historyIndex<=0;
    page.querySelector('[data-editor-command="redo"]').disabled=imageBusy || historyIndex>=editHistory.length-1;
  }
  function resetEditHistory() {
    editHistory=[editorSnapshot()];historyIndex=0;lastEditKind='';updateHistoryButtons();
  }
  function recordEdit(kind='action') {
    if(restoringHistory || composing || historyIndex<0) return;
    const next=editorSnapshot(),current=editHistory[historyIndex],now=Date.now();
    if(current.html===next.html) {
      current.selection=next.selection || current.selection;current.selectedId=next.selectedId;
      if(kind!=='typing') lastEditKind='';
      return;
    }
    const merge=kind==='typing' && lastEditKind==='typing' && now-lastEditTime<700 && historyIndex===editHistory.length-1 && historyIndex>0;
    editHistory.splice(historyIndex+1);
    if(merge) editHistory[historyIndex]=next;
    else { editHistory.push(next);historyIndex++; }
    if(editHistory.length>60) {editHistory.shift();historyIndex--;}
    lastEditKind=kind;lastEditTime=now;updateHistoryButtons();
  }
  function restoreBookmark(bookmark) {
    const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);
    const locate=path=>path.reduce((node,index)=>node?.childNodes[index],editor);
    if(bookmark) {
      const start=locate(bookmark.start),end=locate(bookmark.end);
      if(start && end) try {
        range.setStart(start,Math.min(bookmark.startOffset,start.nodeType===3?start.length:start.childNodes.length));
        range.setEnd(end,Math.min(bookmark.endOffset,end.nodeType===3?end.length:end.childNodes.length));
      } catch(_error) { range.selectNodeContents(editor);range.collapse(false); }
    }
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);savedEditorRange=range.cloneRange();
  }
  function travelHistory(direction) {
    if(imageBusy || composing || mediaEditor.isInteracting()) return;
    recordEdit('boundary');
    const nextIndex=historyIndex+direction;
    if(nextIndex<0 || nextIndex>=editHistory.length) return;
    restoringHistory=true;
    try {
      historyIndex=nextIndex;const state=editHistory[historyIndex];
      images=state.images.slice();coverId=state.coverId;
      mediaEditor.clearSelection();editor.innerHTML=postContent.renderHtml(state.html,images);
      editor.focus({preventScroll:true});restoreBookmark(state.selection);renderImages();
      const selected=Array.from(editor.querySelectorAll('img[data-image-id],a[data-card-id]')).find(img=>(img.dataset.cardId?`card:${img.dataset.cardId}`:img.dataset.imageId)===state.selectedId);
      if(selected) mediaEditor.select(selected);
      lastEditKind='';updateHistoryButtons();scheduleAutosave();
    } finally {restoringHistory=false;}
  }

  function setStatus(message, tone, sticky) {
    window.clearTimeout(statusTimer);
    status.textContent = message || "";
    status.dataset.tone = tone || "neutral";
    if (message && !sticky) statusTimer = window.setTimeout(() => { status.textContent = ""; }, 4000);
  }

  function formatSavedTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "임시저장됨";
    return `임시저장 ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}`;
  }

  function bodyTextFromHtml(html) {
    const holder = document.createElement("div");
    holder.innerHTML = sanitizeHtml(html);
    return (holder.innerText || holder.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function safeImageSource(value) {
    const source = String(value || "");
    if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(source) || /^https:\/\//i.test(source)) return source;
    return "";
  }

  function estimateDataUrlBytes(source) {
    const comma = source.indexOf(",");
    if (comma < 0) return source.length;
    return Math.ceil((source.length - comma - 1) * 0.75);
  }

  function captureDraft() {
    const bodyHtml = sanitizeHtml(editor.innerHTML);
    const usedIds = new Set(postContent.inlineImageIds(bodyHtml));
    const usedImages = images.filter(image => usedIds.has(image.id));
    return {
      title: titleInput.value.trim(),
      bodyHtml,
      bodyText: bodyTextFromHtml(bodyHtml),
      type: selectedType,
      category: categorySelect.value,
      industry: industrySelect.value,
      tags: tags.slice(0, 10),
      images: usedImages.map((image) => ({ id: image.id, src: image.src, alt: image.alt })),
      coverId: usedImages.some((image) => image.id === coverId) ? coverId : (usedImages[0]?.id || ""),
    };
  }

  function hasDraftContent(draft) {
    return Boolean(draft.title || draft.bodyText || draft.type || draft.category || draft.industry || draft.tags.length || draft.images.length);
  }

  function saveDraft(options) {
    const manual = Boolean(options?.manual);
    window.clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    if (!store?.saveDraft) {
      if (manual) setStatus("임시저장 기능을 불러오지 못했습니다.", "error", true);
      return null;
    }
    const draft = captureDraft();
    try {
      if (!hasDraftContent(draft)) {
        store.clearDraft();
        draftTime.textContent = "임시저장된 글 없음";
        if (manual) setStatus("빈 초안을 정리했습니다.", "success");
        return null;
      }
      const saved = store.saveDraft(draft);
      draftTime.textContent = formatSavedTime(saved?.savedAt);
      if (manual) setStatus("이 브라우저에 임시저장했습니다.", "success");
      return saved;
    } catch (error) {
      setStatus(error?.message || "브라우저 저장 공간이 부족해 임시저장하지 못했습니다.", "error", true);
      return null;
    }
  }

  function scheduleAutosave() {
    window.clearTimeout(autosaveTimer);
    draftTime.textContent = "변경사항 저장 중…";
    autosaveTimer = window.setTimeout(() => saveDraft({ manual: false }), AUTOSAVE_DELAY);
  }

  function renderTypes() {
    const list = page.querySelector("[data-post-types]");
    list.replaceChildren();
    POST_TYPES.forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = type;
      button.dataset.postType = type;
      button.classList.toggle("is-selected", type === selectedType);
      button.setAttribute("aria-pressed", String(type === selectedType));
      button.addEventListener("click", () => {
        selectedType = selectedType === type ? "" : type;
        renderTypes();
        scheduleAutosave();
      });
      list.appendChild(button);
    });
  }

  function renderTags() {
    tagList.replaceChildren();
    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.append(`#${tag}`);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `${tag} 태그 삭제`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        tags = tags.filter((item) => item !== tag);
        renderTags();
        scheduleAutosave();
      });
      chip.appendChild(remove);
      tagList.appendChild(chip);
    });
    tagCount.textContent = String(tags.length);
  }

  function addTag(rawValue) {
    const tag = String(rawValue || "").replace(/^#+/, "").replace(/[#,]/g, "").trim().slice(0, 30);
    if (!tag) return;
    if (tags.length >= 10) {
      setStatus("태그는 최대 10개까지 추가할 수 있습니다.", "error");
      return;
    }
    if (!tags.includes(tag)) tags.push(tag);
    tagInput.value = "";
    renderTags();
    scheduleAutosave();
  }

  function renderImages() {
    const ids = new Set(postContent.inlineImageIds(editor.innerHTML));
    const current = images.filter(image => ids.has(image.id));
    const bytes = current.reduce((total, image) => total + estimateDataUrlBytes(image.src), 0);
    imageTotal.textContent = `사진 ${current.length}/3 · ${Math.round(bytes / 1024)}KB / 약 1MB`;
    mediaEditor.refresh();
  }

  function rememberEditorRange() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
      savedEditorRange = range.cloneRange();
    }
  }

  function imageInsertionRange() {
    if (savedEditorRange && editor.contains(savedEditorRange.startContainer) && editor.contains(savedEditorRange.endContainer)) {
      return savedEditorRange.cloneRange();
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  function insertImageAtCaret(id, insertionRange = imageInsertionRange()) {
    const holder = document.createElement("div");
    const marker = document.createElement("img");
    marker.dataset.imageId = id;
    holder.innerHTML = postContent.renderHtml(marker.outerHTML, images);
    const image = holder.firstElementChild;
    if (!image) return insertionRange;
    const range = editor.contains(insertionRange.startContainer) && editor.contains(insertionRange.endContainer)
      ? insertionRange : imageInsertionRange();
    editor.querySelectorAll("img[data-image-id]").forEach((node) => {
      if (node.dataset.imageId === id) node.remove();
    });
    range.collapse(false);
    range.insertNode(image);
    range.setStartAfter(image);
    range.collapse(true);
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedEditorRange = range.cloneRange();
    image.scrollIntoView?.({ block: "nearest" });
    mediaEditor.refresh();
    return range;
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 읽을 수 없습니다.")); };
      image.src = url;
    });
  }

  async function compressImage(file, targetBytes) {
    if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 추가할 수 있습니다.");
    if (file.size > MAX_SOURCE_BYTES) throw new Error("원본 이미지 한 장은 15MB 이하여야 합니다.");
    const source = await readImage(file);
    const initialScale = Math.min(1, 1200 / Math.max(source.naturalWidth, source.naturalHeight));
    let width = Math.max(1, Math.round(source.naturalWidth * initialScale));
    let height = Math.max(1, Math.round(source.naturalHeight * initialScale));
    let quality = 0.86;
    let best = "";

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(source, 0, 0, width, height);
      best = canvas.toDataURL("image/jpeg", quality);
      if (estimateDataUrlBytes(best) <= targetBytes) return best;
      if (quality > 0.52) quality -= 0.08;
      else {
        width = Math.max(320, Math.round(width * 0.82));
        height = Math.max(240, Math.round(height * 0.82));
      }
    }
    if (estimateDataUrlBytes(best) > targetBytes) throw new Error("이미지를 약 1MB 저장 한도 안으로 줄일 수 없습니다.");
    return best;
  }

  async function handleImageFiles(fileList, targetRange) {
    if (imageBusy) return;
    const usedIds = new Set(postContent.inlineImageIds(editor.innerHTML));
    images = images.filter(image => usedIds.has(image.id));
    let insertionRange = targetRange || imageInsertionRange();
    const files = Array.from(fileList || []).slice(0, MAX_IMAGES - images.length);
    if (!files.length) {
      if (images.length >= MAX_IMAGES) setStatus("이미지는 최대 3장까지 추가할 수 있습니다.", "error");
      return;
    }
    imageBusy = true;
    recordEdit('boundary');
    editor.setAttribute('contenteditable','false');
    page.querySelectorAll('.posting-toolbar button').forEach(button=>{button.disabled=true;});
    updateHistoryButtons();
    inlineImageButton.disabled = true;
    publishButton.disabled = true;
    editor.setAttribute('aria-busy','true');
    setStatus("이미지를 브라우저 저장용으로 압축하고 있습니다…", "neutral", true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const usedBytes = images.reduce((total, image) => total + estimateDataUrlBytes(image.src), 0);
        const remainingSlots = files.length - index;
        const targetBytes = Math.floor((MAX_IMAGE_BYTES - usedBytes) / remainingSlots);
        if (targetBytes < 40000) throw new Error("이미지 전체 저장 한도(약 1MB)를 초과했습니다.");
        const source = await compressImage(files[index], Math.min(420000, targetBytes));
        const id = window.crypto?.randomUUID?.() || `image-${Date.now()}-${index}`;
        images.push({ id, src: source, alt: files[index].name.replace(/\.[^.]+$/, "") || `첨부 이미지 ${images.length + 1}` });
        if (!coverId) coverId = id;
        insertionRange = insertImageAtCaret(id, insertionRange);
      }
      renderImages();
      scheduleAutosave();
      setStatus("본문에 이미지를 넣었습니다. 사진 아래에 이어서 작성해보세요.", "success");
    } catch (error) {
      renderImages();
      scheduleAutosave();
      setStatus(error?.message || "이미지를 처리하지 못했습니다.", "error", true);
    } finally {
      imageBusy = false;
      editor.setAttribute('contenteditable','true');
      page.querySelectorAll('.posting-toolbar button').forEach(button=>{button.disabled=false;});
      recordEdit();updateHistoryButtons();
      inlineImageButton.disabled = false;
      publishButton.disabled = false;
      editor.removeAttribute('aria-busy');
      imageInput.value = "";
    }
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== "object") return;
    titleInput.value = String(draft.title || "").slice(0, 100);
    selectedType = POST_TYPES.includes(draft.type) ? draft.type : "";
    if (Array.from(categorySelect.options).some((option) => option.value === draft.category)) categorySelect.value = draft.category;
    if (Array.from(industrySelect.options).some((option) => option.value === draft.industry)) industrySelect.value = draft.industry;
    tags = Array.isArray(draft.tags) ? [...new Set(draft.tags.map((tag) => String(tag).replace(/^#+/, "").trim()).filter(Boolean))].slice(0, 10) : [];
    let restoredBytes = 0;
    images = Array.isArray(draft.images) ? draft.images.slice(0, MAX_IMAGES).map((image, index) => ({
      id: String(image?.id || `restored-${index}`),
      src: safeImageSource(image?.src),
      alt: String(image?.alt || `첨부 이미지 ${index + 1}`).slice(0, 120),
    })).filter((image) => {
      const bytes = estimateDataUrlBytes(image.src);
      if (!image.src || restoredBytes + bytes > MAX_IMAGE_BYTES) return false;
      restoredBytes += bytes;
      return true;
    }) : [];
    coverId = images.some((image) => image.id === draft.coverId) ? String(draft.coverId) : (images[0]?.id || "");
    editor.innerHTML = postContent.renderHtml(draft.bodyHtml || "", images);
    const existingIds = new Set(postContent.inlineImageIds(editor.innerHTML));
    images.filter(image => !existingIds.has(image.id)).forEach(image => {
      const marker = document.createElement('img'); marker.dataset.imageId = image.id;
      editor.insertAdjacentHTML('beforeend', postContent.renderHtml(marker.outerHTML, [image]));
    });
    savedEditorRange = null;
    titleCount.textContent = String(titleInput.value.length);
    renderTypes();
    renderTags();
    renderImages();
    if (draft.savedAt) draftTime.textContent = formatSavedTime(draft.savedAt);
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "방금 전";
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "방금 전";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
    return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
  }

  function renderFeedPost(post) {
    if (!post?.id || document.querySelector(`.post-card[data-post-id="${CSS.escape(String(post.id))}"]`)) return;
    const feed = document.querySelector(".feed-panel");
    if (!feed) return;
    const card = document.createElement("article");
    card.className = "post-card";
    card.dataset.postId = String(post.id);
    card.dataset.authorId = String(post.authorId || "");

    const header = document.createElement("header");
    header.className = "post-head";
    const identity = document.createElement("div");
    const avatar = document.createElement("img");
    avatar.alt = "";
    avatar.src = safeImageSource(post.avatar) || safeImageSource(store?.USER?.avatar) || "";
    const authorMeta = document.createElement("span");
    const author = document.createElement("strong");
    author.textContent = String(post.author || store?.USER?.name || "misamo_korea");
    const created = document.createElement("small");
    created.textContent = relativeTime(post.createdAt);
    authorMeta.append(author, created);
    identity.append(avatar, authorMeta);
    header.appendChild(identity);

    const body = document.createElement("div");
    body.className = "post-body";
    const copy = document.createElement("div");
    copy.className = "post-copy";
    const heading = document.createElement("h2");
    heading.textContent = String(post.title || "");
    const richBody = document.createElement("div");
    richBody.className = "post-rich-body";
    const sanitizedPostHtml = postContent.renderHtml(post.bodyHtml || "", post.images || []);
    if (sanitizedPostHtml) richBody.innerHTML = sanitizedPostHtml;
    else {
      const paragraph = document.createElement("p");
      paragraph.textContent = String(post.bodyText || "");
      richBody.appendChild(paragraph);
    }
    copy.append(heading, richBody);
    const postTags = Array.isArray(post.tags) ? post.tags.slice(0, 10) : [];
    if (postTags.length) {
      const tagWrap = document.createElement("div");
      tagWrap.className = "tags";
      postTags.forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = `#${String(tag).replace(/^#+/, "")}`;
        tagWrap.appendChild(span);
      });
      copy.appendChild(tagWrap);
    }
    body.appendChild(copy);
    const postImages = Array.isArray(post.images) ? post.images : [];
    const inlineIds = new Set(postContent.inlineImageIds(richBody.innerHTML));
    if (inlineIds.size) card.classList.add("posting-inline-post");
    const remainingImages = postImages.filter((image) => !inlineIds.has(image?.id));
    const cover = remainingImages.find((image) => image?.id === post.coverId) || remainingImages[0];
    const coverSource = safeImageSource(cover?.src);
    if (coverSource) {
      const image = document.createElement("img");
      image.className = "post-image";
      image.src = coverSource;
      image.alt = String(cover?.alt || "게시글 대표 이미지");
      body.appendChild(image);
    } else {
      card.classList.add("posting-no-image");
    }

    let likeState = { liked: false, count: 0 };
    let commentCount = 0;
    try { likeState = store?.getPostLike?.(post.id) || likeState; } catch (_error) { /* keep defaults */ }
    try { commentCount = Number(store?.readComments?.(post.id)?.total || 0); } catch (_error) { /* keep defaults */ }
    const footer = document.createElement("footer");
    footer.className = "post-actions";
    footer.innerHTML = `<div><button type="button" class="action-button" data-like-button aria-label="${likeState.liked ? "좋아요 취소" : "좋아요"}" aria-pressed="${Boolean(likeState.liked)}"><i data-lucide="heart"></i><span data-like-count>${Number(likeState.count) || 0}</span></button><button type="button" class="action-button" data-comments-open aria-label="댓글 보기" aria-haspopup="dialog"><i data-lucide="message-circle"></i><span data-comments-count>${Number.isFinite(commentCount) ? commentCount : 0}</span></button></div>`;
    card.append(header, body, footer);
    const firstPost = feed.querySelector(".post-card");
    feed.insertBefore(card, firstPost || null);
  }

  function hydratePosts() {
    if (!store?.getPosts) return;
    try {
      const posts = store.getPosts();
      if (!Array.isArray(posts)) return;
      posts.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach(renderFeedPost);
    } catch (_error) {
      setStatus("저장된 게시글 일부를 불러오지 못했습니다.", "error");
    }
  }

  function openPreview() {
    const draft = captureDraft();
    previewDialog.querySelector("[data-preview-title]").textContent = draft.title || "제목 없음";
    const previewBody = previewDialog.querySelector("[data-preview-body]");
    previewBody.innerHTML = postContent.renderHtml(draft.bodyHtml, draft.images) || "<p>내용이 없습니다.</p>";
    const meta = previewDialog.querySelector("[data-preview-meta]");
    meta.textContent = [draft.type, draft.category, draft.industry].filter(Boolean).join(" · ") || "분류 없음";
    const previewImages = previewDialog.querySelector("[data-preview-images]");
    previewImages.replaceChildren();
    const inlineIds = new Set(postContent.inlineImageIds(previewBody.innerHTML));
    draft.images.filter((entry) => !inlineIds.has(entry.id)).forEach((entry) => {
      const image = document.createElement("img");
      image.src = safeImageSource(entry.src);
      image.alt = entry.alt;
      previewImages.appendChild(image);
    });
    const previewTags = previewDialog.querySelector("[data-preview-tags]");
    previewTags.replaceChildren();
    draft.tags.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = `#${tag}`;
      previewTags.appendChild(span);
    });
    previewDialog.showModal();
    window.createMisamoIcons?.();
  }

  function resetComposer() {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    titleInput.value = "";
    editor.replaceChildren();
    mediaEditor.clearSelection();
    savedEditorRange = null;
    selectedType = "";
    categorySelect.value = "";
    industrySelect.value = "";
    tags = [];
    images = [];
    coverId = "";
    titleCount.textContent = "0";
    draftTime.textContent = "아직 저장되지 않음";
    renderTypes();
    renderTags();
    renderImages();
    resetEditHistory();
  }

  function publishPost() {
    if (imageBusy) return;
    const draft = captureDraft();
    if (!draft.title) {
      setStatus("제목을 입력해주세요.", "error", true);
      titleInput.focus();
      return;
    }
    if (!draft.bodyText) {
      setStatus("본문 내용을 입력해주세요.", "error", true);
      editor.focus();
      return;
    }
    if (!store?.publish) {
      setStatus("게시 저장 기능을 불러오지 못했습니다.", "error", true);
      return;
    }
    try {
      const post = store.publish(draft);
      window.clearTimeout(autosaveTimer);
      autosaveTimer = 0;
      renderFeedPost(post);
      resetComposer();
      setStatus("게시글을 이 브라우저의 피드에 추가했습니다.", "success");
      window.dispatchEvent(new CustomEvent("misamo:post-published", { detail: { post } }));
      window.createMisamoIcons?.();
      if (typeof window.misamoNavigate === "function") window.misamoNavigate("home");
      else window.location.hash = "home";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus(error?.message || "게시글을 저장하지 못했습니다.", "error", true);
    }
  }

  titleInput.addEventListener("input", () => {
    titleCount.textContent = String(titleInput.value.length);
    scheduleAutosave();
  });
  document.addEventListener("selectionchange", rememberEditorRange);
  editor.addEventListener("keyup", rememberEditorRange);
  editor.addEventListener("pointerup", rememberEditorRange);
  editor.addEventListener('compositionstart',()=>{recordEdit('boundary');composing=true;});
  editor.addEventListener('compositionend',()=>{composing=false;recordEdit('action');scheduleAutosave();});
  editor.addEventListener('beforeinput',event=>{
    if(event.inputType==='historyUndo' || event.inputType==='historyRedo') {
      event.preventDefault();travelHistory(event.inputType==='historyUndo'?-1:1);
    }
  });
  page.querySelector('.posting-editor-block').addEventListener('keydown',event=>{
    if(!(event.ctrlKey || event.metaKey) || event.altKey || event.target===titleInput || event.isComposing) return;
    const key=event.key.toLowerCase();
    if(key==='z' || key==='y') {event.preventDefault();event.stopPropagation();travelHistory(key==='y' || event.shiftKey?1:-1);}
  },true);
  editor.addEventListener("input", event => { rememberEditorRange(); renderImages(); recordEdit(event.inputType==='insertText'?'typing':'action'); scheduleAutosave(); });
  inlineImageButton.addEventListener("mousedown", (event) => event.preventDefault());
  inlineImageButton.addEventListener("click", () => {
    if (postContent.inlineImageIds(editor.innerHTML).length >= MAX_IMAGES) {
      setStatus("이미지는 최대 3장입니다. 본문의 사진을 선택해 삭제한 뒤 추가해주세요.", "error", true);
      return;
    }
    rememberEditorRange();
    imageInput.click();
  });
  const linkMenu=document.createElement('div');
  linkMenu.dataset.linkContextMenu='';linkMenu.className='posting-link-menu';
  linkMenu.setAttribute('role','menu');linkMenu.setAttribute('aria-label','링크 메뉴');linkMenu.hidden=true;
  const viewLink=document.createElement('a');viewLink.textContent='링크 보기';
  viewLink.setAttribute('role','menuitem');viewLink.target='_blank';viewLink.rel='noopener noreferrer';
  linkMenu.append(viewLink);document.body.append(linkMenu);
  const editLink=document.createElement('button');editLink.type='button';editLink.textContent='링크 수정';editLink.setAttribute('role','menuitem');linkMenu.append(editLink);
  let contextCard=null;
  function closeLinkMenu() {linkMenu.hidden=true;contextCard=null;viewLink.removeAttribute('href');}
  function editorCard(target) {
    const card=target instanceof Element?target.closest('a[data-link-card="1"]'):null;
    return card && editor.contains(card)?card:null;
  }
  ['click','auxclick'].forEach(type=>editor.addEventListener(type,event=>{
    if(editorCard(event.target)) event.preventDefault();
  }));
  editor.addEventListener('contextmenu',event=>{
    const card=editorCard(event.target);closeLinkMenu();if(!card) return;
    let url;try {url=new URL(card.href);if(url.protocol!=='https:' || url.username || url.password) return;}catch(_){return;}
    event.preventDefault();contextCard=card;viewLink.href=url.href;linkMenu.hidden=false;
    const rect=card.getBoundingClientRect();
    const x=event.clientX || rect.left;const y=event.clientY || rect.bottom;
    linkMenu.style.left=`${Math.max(8,Math.min(x,window.innerWidth-linkMenu.offsetWidth-8))}px`;
    linkMenu.style.top=`${Math.max(8,Math.min(y,window.innerHeight-linkMenu.offsetHeight-8))}px`;
    viewLink.focus({preventScroll:true});
  });
  viewLink.addEventListener('click',event=>{
    if(!contextCard || !editor.contains(contextCard)) {event.preventDefault();closeLinkMenu();return;}
    // Let the genuine link click open the new tab before removing its destination.
    window.setTimeout(closeLinkMenu,0);
  });
  editLink.addEventListener('click',async()=>{
    const card=contextCard;closeLinkMenu();if(imageBusy || !card || !editor.contains(card)) return;
    const value=window.prompt('새 HTTPS 주소를 입력해주세요.',card.href);if(value===null) return;
    let url;try {url=new URL(value.trim());if(url.protocol!=='https:' || url.username || url.password || url.href.length>2048) throw new Error();}catch(_){setStatus('올바른 HTTPS 주소를 입력해주세요.','error');return;}
    recordEdit('boundary');imageBusy=true;editor.contentEditable='false';
    const buttons=Array.from(page.querySelectorAll('.posting-toolbar button,[data-publish-post]'));const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
    setStatus('새 링크 정보를 가져오는 중입니다…','neutral',true);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
    try {
      const response=await fetch(`/api/link-preview?url=${encodeURIComponent(url.href)}`,{signal:controller.signal,credentials:'omit'});if(!response.ok) throw new Error();
      const data=await response.json();
      if(!editor.contains(card)) return;
      const holder=document.createElement('template');holder.innerHTML=postContent.linkCard({...data,url:url.href});
      const replacement=holder.content.firstElementChild;if(!replacement) throw new Error();
      for(const name of ['data-card-id','data-image-width','data-align']) if(card.hasAttribute(name)) replacement.setAttribute(name,card.getAttribute(name));
      holder.innerHTML=postContent.renderHtml(holder.innerHTML,[]);const rendered=holder.content.firstElementChild;
      card.replaceWith(rendered);renderImages();mediaEditor.select(rendered);recordEdit();scheduleAutosave();setStatus('링크를 수정했습니다.','success');
    } catch(_){setStatus('새 링크 정보를 가져오지 못해 기존 카드를 유지했습니다.','error');}
    finally {clearTimeout(timer);imageBusy=false;editor.contentEditable='true';buttons.forEach((b,i)=>b.disabled=disabled[i]);updateHistoryButtons();}
  });
  document.addEventListener('pointerdown',event=>{if(!linkMenu.contains(event.target)) closeLinkMenu();},true);
  document.addEventListener('keydown',event=>{
    if(linkMenu.hidden) return;
    if(event.key==='Escape') {event.preventDefault();const card=contextCard;closeLinkMenu();card?.focus({preventScroll:true});}
    else if(event.key==='ArrowDown' || event.key==='ArrowUp') {event.preventDefault();(document.activeElement===viewLink?editLink:viewLink).focus();}
  });
  linkMenu.addEventListener('focusout',()=>window.setTimeout(()=>{if(!linkMenu.contains(document.activeElement)) closeLinkMenu();},0));
  document.addEventListener('scroll',closeLinkMenu,true);
  window.addEventListener('resize',closeLinkMenu);
  window.addEventListener('blur',closeLinkMenu);
  window.addEventListener('hashchange',closeLinkMenu);
  window.addEventListener('misamo:view',closeLinkMenu);
  editor.addEventListener('input',closeLinkMenu);

  function standaloneLink(text, range) {
    if(!range.collapsed || /\s/.test(text.trim())) return '';
    try {
      const url=new URL(text.trim());
      if(url.protocol!=='https:' || url.username || url.password || url.href.length>2048) return '';
      let block=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
      while(block!==editor && !block.matches('p,div,li')) block=block.parentElement;
      if(block.textContent.trim() || block.querySelector('img,a[data-link-card]')) return '';
      return url.href;
    } catch(_){return '';}
  }
  async function insertLinkPreview(url, range) {
    if(imageBusy) return;
    imageBusy=true;recordEdit('boundary');
    const placeholder=document.createElement('a');placeholder.href=url;placeholder.target='_blank';
    placeholder.rel='noopener noreferrer';placeholder.textContent=url;
    range.insertNode(placeholder);range.setStartAfter(placeholder);range.collapse(true);
    const trailingBreak=document.createElement('br');range.insertNode(trailingBreak);range.setStartAfter(trailingBreak);range.collapse(true);
    // Persist the address before networking so refresh/navigation cannot lose the paste.
    saveDraft({manual:false});
    const buttons=Array.from(page.querySelectorAll('.posting-toolbar button, [data-publish-post]'));
    const disabled=buttons.map(button=>button.disabled);
    buttons.forEach(button=>button.disabled=true);
    editor.contentEditable='false';editor.setAttribute('aria-busy','true');
    setStatus('링크 미리보기를 가져오는 중입니다…','info',true);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
    let html='';let success=false;
    try {
      const response=await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`,{signal:controller.signal,credentials:'omit'});
      if(!response.ok) throw new Error();
      const data=await response.json();html=postContent.linkCard({...data,url});success=Boolean(html);
    } catch(_){/* A blocked or unavailable page remains an ordinary address. */}
    finally {clearTimeout(timer);}
    try {
      if(!editor.contains(placeholder)) return;
      const holder=document.createElement('template');
      if(success) holder.innerHTML=postContent.renderHtml(html,[]);
      if(success) placeholder.replaceWith(holder.content);
      range.setStartAfter(trailingBreak);range.collapse(true);
      if(writingActive) {const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
      mediaEditor.clearSelection();rememberEditorRange();renderImages();recordEdit();scheduleAutosave();
      setStatus(success?'링크 카드를 추가했습니다.':'미리보기를 가져오지 못해 주소로 추가했습니다.','info');
    } finally {
      imageBusy=false;editor.contentEditable='true';editor.removeAttribute('aria-busy');
      buttons.forEach((button,index)=>button.disabled=disabled[index]);updateHistoryButtons();
    }
  }
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    if(imageBusy || composing) return;
    const text = (event.clipboardData?.getData("text/plain") || "").replace(/\r\n?/g,'\n');
    if(!text) return;
    rememberEditorRange();recordEdit('boundary');
    const range=imageInsertionRange(),fragment=document.createDocumentFragment();
    const url=standaloneLink(text,range);
    if(url) {void insertLinkPreview(url,range);return;}
    text.split('\n').forEach((line,index)=>{
      if(index) fragment.append(document.createElement('br'));
      fragment.append(document.createTextNode(line));
    });
    const last=fragment.lastChild;
    range.deleteContents();range.insertNode(fragment);range.setStartAfter(last);range.collapse(true);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    mediaEditor.clearSelection();rememberEditorRange();renderImages();recordEdit();scheduleAutosave();
  });
  page.querySelectorAll("[data-editor-command]").forEach((button) => {
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener("click", () => {
      if(button.dataset.editorCommand==='undo' || button.dataset.editorCommand==='redo') {
        travelHistory(button.dataset.editorCommand==='undo'?-1:1);return;
      }
      recordEdit('boundary');
      editor.focus();
      document.execCommand(button.dataset.editorCommand, false, button.dataset.commandValue || null);
      recordEdit();
      scheduleAutosave();
    });
  });
  page.querySelector("[data-editor-link]").addEventListener("click", () => {
    if(imageBusy) return;
    const href = window.prompt("연결할 HTTPS 주소를 입력해주세요. (https://로 시작)");
    if (href === null) return;
    if (!/^https:\/\//i.test(href.trim())) {
      setStatus("안전한 HTTPS 주소만 링크로 추가할 수 있습니다.", "error");
      return;
    }
    try {
      const url = new URL(href.trim());
      if (url.protocol !== "https:") throw new Error();
      const range=imageInsertionRange();
      if(standaloneLink(url.href,range)) {void insertLinkPreview(url.href,range);return;}
      editor.focus();
      recordEdit('boundary');
      document.execCommand("createLink", false, url.href);
      recordEdit();
      scheduleAutosave();
    } catch (_error) {
      setStatus("올바른 HTTPS 주소를 입력해주세요.", "error");
    }
  });
  [categorySelect, industrySelect].forEach((select) => select.addEventListener("change", scheduleAutosave));
  tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput.value);
    }
  });
  tagInput.addEventListener("blur", () => addTag(tagInput.value));
  imageInput.addEventListener("change", () => handleImageFiles(imageInput.files));
  page.querySelector("[data-save-draft]").addEventListener("click", () => saveDraft({ manual: true }));
  page.querySelector("[data-preview-post]").addEventListener("click", openPreview);
  page.querySelector("[data-publish-post]").addEventListener("click", publishPost);
  page.querySelector("[data-write-back]").addEventListener("click", () => {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    saveDraft({ manual: false });
    if (typeof window.misamoNavigate === "function") window.misamoNavigate("home");
    else window.location.hash = "home";
  });
  previewDialog.querySelector("[data-preview-close]").addEventListener("click", () => previewDialog.close());
  previewDialog.addEventListener("click", (event) => {
    if (event.target === previewDialog) previewDialog.close();
  });
  window.addEventListener("misamo:view", (event) => {
    if (event.detail !== "write" && writingActive && autosaveTimer) {
      window.clearTimeout(autosaveTimer);
      autosaveTimer = 0;
      saveDraft({ manual: false });
    }
    writingActive = event.detail === "write";
    if (event.detail === "write") {
      titleCount.textContent = String(titleInput.value.length);
      window.createMisamoIcons?.();
    }
  });
  window.addEventListener("pagehide", () => {
    if (!autosaveTimer) return;
    window.clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    saveDraft({ manual: false });
  });

  renderTypes();
  renderTags();
  renderImages();
  try { applyDraft(store?.readDraft?.()); } catch (error) { setStatus(error?.message || "임시저장 글을 불러오지 못했습니다.", "error", true); }
  resetEditHistory();
  hydratePosts();
})();
