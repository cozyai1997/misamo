(function(root) {
  'use strict';
  function createCloudPosts({client, config, storage, video, content, validate, Upload, onProgress = () => {}}) {
    const cache = new Map();
    const key = 'misamo.cloud.migration.v1';
    let user = null, writing = false;
    const copy = value => JSON.parse(JSON.stringify(value));
    function journal() {
      const raw = storage.getItem(key);
      if (!raw) return { migrated: {}, pending: {} };
      const value = JSON.parse(raw);
      if (!value.migrated || !value.pending) throw Error('이전 기록을 읽을 수 없습니다. 원본은 보존되어 있습니다.');
      return value;
    }
    function saveJournal(value) { storage.setItem(key, JSON.stringify(value)); }
    function requireUser() { if (!user || user.is_anonymous) throw Error('게시하려면 계정에 로그인해주세요. 작성한 내용은 그대로 남아 있습니다.'); return user; }
    function decode(row) {
      const p = copy(row.payload);
      p.bodyHtml = content.sanitizeHtml(p.bodyHtml);
      p.images = (Array.isArray(p.images) ? p.images : []).filter(i => root.MisamoCloudMedia.safeSource(i?.src)).slice(0, 3);
      p.video = p.video ? video.cleanVideo(p.video) : null;
      return {...p, id: row.id, authorId: row.owner_id, createdAt: row.created_at, revision: row.revision, cloud: true, visibility: 'public', deleted: row.deleted};
    }
    function accept(row) { const post = decode(row); cache.set(row.id, post); return copy(post); }
    async function load() {
      const next = new Map();
      // Page through the API instead of silently losing posts above its row limit.
      for (let offset = 0; ; offset += 100) {
        const {data, error} = await client.from('community_posts').select('*').order('created_at', {ascending:false}).order('id').range(offset, offset + 99);
        if (error) throw Error('공개 게시글을 불러오지 못했습니다. 연결을 확인하고 다시 시도해주세요.');
        data.forEach(row => next.set(row.id, decode(row)));
        if (data.length < 100) break;
      }
      cache.clear(); next.forEach((p,id) => cache.set(id,p));
      return posts();
    }
    function posts() { return copy([...cache.values()].filter(p => !p.deleted)); }
    async function find(id) {
      if (!/^[a-f0-9-]{36}$/.test(id)) return null;
      const {data,error} = await client.from('community_posts').select('*').eq('id',id).maybeSingle();
      if (error) throw Error('게시글을 불러오지 못했습니다. 다시 시도해주세요.');
      return data && !data.deleted ? accept(data) : null;
    }
    async function upload(blob, postId, extension) {
      const owner = requireUser().id;
      if (blob.size > config.maxUploadBytes) throw Error(`현재 서버는 파일당 ${Math.floor(config.maxUploadBytes / 1024 / 1024)}MB까지 지원합니다. 원본과 글은 보존됩니다.`);
      const path = `${owner}/${postId}/${root.crypto.randomUUID()}.${extension}`;
      if (blob.size <= 6 * 1024 * 1024) {
        const {error} = await client.storage.from(config.bucket).upload(path, blob, {contentType:blob.type, upsert:false});
        if (error) throw Error('첨부 파일 업로드에 실패했습니다. 원본은 보존됩니다. 다시 시도해주세요.');
      } else {
        await new Promise((resolve,reject) => {
          const task = new Upload(blob, {
            endpoint: `${config.url.replace('.supabase.co','.storage.supabase.co')}/storage/v1/upload/resumable`,
            retryDelays:[0,1000,3000,5000], chunkSize:6*1024*1024, uploadDataDuringCreation:true,
            removeFingerprintOnSuccess:true,
            metadata:{bucketName:config.bucket,objectName:path,contentType:blob.type,cacheControl:'3600'},
            onBeforeRequest:async request => {
              const {data:{session}} = await client.auth.getSession();
              if (!session || session.user.id !== owner) throw Error('다시 로그인해주세요.');
              request.setHeader('Authorization', `Bearer ${session.access_token}`);
              request.setHeader('apikey',config.key);
            },
            onProgress:(sent,total) => onProgress(`영상 업로드 ${Math.round(sent/total*100)}%`),
            onSuccess:resolve,
            onError:() => reject(Error('영상 업로드에 실패했습니다. 원본은 보존됩니다. 다시 시도해주세요.'))
          });
          task.start();
        });
      }
      return client.storage.from(config.bucket).getPublicUrl(path).data.publicUrl;
    }
    async function prepare(draft, id) {
      const payload = validate(draft);
      if (!payload.title.trim() || payload.title.trim().length > 100 || !payload.bodyText.trim() || payload.bodyText.length > 20000 || payload.bodyHtml.length > 100000) throw Error('제목과 본문 길이를 확인해주세요.');
      // Check the largest file before sending any attachment.
      if (payload.video && payload.video.source !== 'cloud' && payload.video.size > config.maxUploadBytes) throw Error(`현재 서버는 영상당 ${Math.floor(config.maxUploadBytes/1024/1024)}MB까지 지원합니다. 원본은 보존됩니다.`);
      payload.bodyHtml = content.sanitizeHtml(payload.bodyHtml);
      for (const image of payload.images) {
        if (root.MisamoCloudMedia.safeSource(image.src)) continue;
        const response = await root.fetch(image.src);
        const blob = await response.blob();
        image.src = await upload(blob,id,blob.type.split('/')[1].replace('jpeg','jpg'));
      }
      if (payload.video && payload.video.source !== 'cloud') {
        const record = payload.video;
        const blob = await video.exportBlob(record);
        const extension = {'video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'}[record.mime];
        payload.video = {...record,source:'cloud',src:await upload(blob,id,extension)};
      }
      payload.author = String(draft.author || user.user_metadata?.display_name || '미사모 회원').slice(0,50);
      payload.avatar = '';
      payload.visibility = 'public';
      return payload;
    }
    async function publish(draft, options = {}) {
      if(writing) throw Error('다른 게시글을 저장 중입니다. 완료 후 다시 시도해주세요.');
      writing=true;
      try { return await publishOne(draft,options); } finally { writing=false; }
    }
    async function publishOne(draft, {legacyId = null, editing = null} = {}) {
      const owner = requireUser().id;
      if(editing && editing.authorId !== owner) throw Error('본인 게시글만 수정할 수 있습니다.');
      const state = journal();
      const digest = Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(draft)))),b=>b.toString(16).padStart(2,'0')).join('');
      const operation = `${owner}:${legacyId || digest}`;
      let id = editing?.id || state.pending[operation] || state.migrated[legacyId];
      if (!id) id = legacyId && /^[a-f0-9-]{36}$/.test(legacyId) ? legacyId : root.crypto.randomUUID();
      if (!editing) {
        state.pending[operation] = id; saveJournal(state);
        let query = client.from('community_posts').select('*').eq('owner_id',owner);
        query = legacyId ? query.eq('legacy_id',legacyId) : query.eq('id',id);
        const {data,error} = await query.maybeSingle();
        if (error) throw Error('게시 상태를 확인하지 못했습니다. 원본은 보존됩니다.');
        if (data) { if(legacyId) { state.migrated[legacyId]=data.id; saveJournal(state); } return accept(data); }
      }
      const payload = await prepare(draft,id);
      if (requireUser().id !== owner) throw Error('계정이 변경되었습니다. 다시 시도해주세요.');
      const row = {payload, revision:editing ? editing.revision+1 : 1};
      const query = editing
        ? client.from('community_posts').update(row).eq('id',id).eq('owner_id',owner).eq('revision',editing.revision)
        : client.from('community_posts').insert({...row,id,owner_id:owner,legacy_id:legacyId,...(legacyId && Number.isFinite(Date.parse(draft.createdAt)) ? {created_at:draft.createdAt} : {})});
      const {data,error} = await query.select('*').maybeSingle();
      if (error || !data) throw Error(editing ? '수정 내용을 저장하지 못했습니다. 다른 기기에서 변경되었는지 확인해주세요. 입력 내용은 유지됩니다.' : '게시글 저장에 실패했습니다. 원본은 보존됩니다. 다시 시도해주세요.');
      if (legacyId) { state.migrated[legacyId] = id; saveJournal(state); }
      return accept(data);
    }
    function finishPublish() { const state=journal(); state.pending={}; saveJournal(state); }
    async function remove(post) {
      const owner=requireUser().id;
      const {data,error}=await client.from('community_posts').update({deleted:true,revision:post.revision+1}).eq('id',post.id).eq('owner_id',owner).eq('revision',post.revision).select('id').maybeSingle();
      if(error || !data) throw Error('삭제하지 못했습니다. 게시글을 새로고침하고 다시 시도해주세요.');
      cache.set(post.id,{...post,deleted:true});
    }
    return {load,find,posts,publish,remove,finishPublish,setUser:value=>{user=value;},get user(){return user;},isOwner:p=>p?.cloud ? Boolean(user && p.authorId===user.id) : p?.authorId==='demo-me',isMigrated:id=>Boolean(journal().migrated[id]),mappedId:id=>journal().migrated[id] || id};
  }
  if (typeof module === 'object' && module.exports) module.exports={createCloudPosts};
  root.createMisamoCloudPosts=createCloudPosts;
})(typeof window === 'object' ? window : globalThis);
