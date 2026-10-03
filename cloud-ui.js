(function () {
  'use strict';
  const config=window.MisamoCloudConfig, libs=window.MisamoCloudLibraries;
  const bar=document.createElement('section'); bar.className='cloud-status'; bar.setAttribute('aria-label','게시글 동기화');
  const message=document.createElement('span'); message.setAttribute('role','status');
  const account=document.createElement('button'); account.type='button'; account.textContent='로그인';
  const migrate=document.createElement('button'); migrate.type='button'; migrate.textContent='기존 글 옮기기';
  const retry=document.createElement('button'); retry.type='button'; retry.textContent='다시 불러오기'; retry.hidden=true;
  bar.append(message,account,migrate,retry); document.querySelector('.feed-panel')?.prepend(bar);
  const note=document.querySelector('.posting-demo-notice');
  if(note) { note.replaceChildren(); const text=document.createElement('span');text.textContent='게시글은 전체 공개됩니다. 임시저장은 이 브라우저에 보관됩니다.';const b=account.cloneNode(true);b.addEventListener('click',()=>account.click());note.append(text,b); }
  const visibility=document.querySelector('.posting-visibility-card');
  if(visibility) {visibility.replaceChildren();const h=document.createElement('h2');h.textContent='전체 공개';const p=document.createElement('p');p.textContent='게시하면 PC와 모바일에서 같은 글을 볼 수 있습니다.';visibility.append(h,p);}
  const limitNote=[...document.querySelectorAll('.posting-video-hint')].find(p=>p.textContent.includes('최대 1GB'));
  if(limitNote)limitNote.textContent='사진 최대 3장 + 영상 1개 · 서버 업로드 최대 50MB · 영상 최대 5분 · MP4/MOV 권장. 기존 큰 영상은 PC에 보존됩니다.';
  if(!libs || !config) {message.textContent='서버 연결 파일을 불러오지 못했습니다. 새로고침해주세요.'; window.MisamoCloudUnavailable=true; return;}
  const client=libs.createClient(config.url,config.key);
  const cloud=window.MisamoCloud=window.createMisamoCloudPosts({client,config,storage:localStorage,video:window.MisamoVideo,content:window.MisamoContent,validate:window.MisamoStore.validateDraft,Upload:libs.Upload,onProgress:text=>{message.textContent=text;const status=document.querySelector('[data-posting-status]');if(status)status.textContent=text;}});
  let loading=null, migrationBusy=false;
  function localPosts() {
    const raw=localStorage.getItem('misamo.prototype.v1');
    if(!raw)return [];
    const state=JSON.parse(raw);
    if(!Array.isArray(state.posts))throw Error('기존 게시글을 읽을 수 없습니다. 저장 데이터를 초기화하지 마세요.');
    const community=window.MisamoCommunity.state();
    return state.posts.filter(p=>!community.deleted.includes(p.id) && !cloud.isMigrated(p.id)).map(p=>({...p,...community.edits[p.id]}));
  }
  function paint() {
    account.textContent=cloud.user?'계정 · 로그아웃':'로그인';
    document.querySelector('.posting-demo-notice button').textContent=cloud.user?'계정':'로그인';
    let count=0;try{count=localPosts().length;}catch(e){message.textContent=e.message;}
    migrate.hidden=!count; migrate.textContent=`기존 글 ${count}개 옮기기`;
    document.querySelectorAll('.post-card[data-post-id]').forEach(card=>{
      if(cloud.isMigrated(card.dataset.postId) && !cloud.posts().some(p=>p.id===card.dataset.postId)) {window.MisamoVideo.release(card);card.remove();}
    });
    const publicPosts=cloud.posts();
    document.querySelectorAll('.post-card[data-cloud-post]').forEach(card=>{if(!publicPosts.some(p=>p.id===card.dataset.postId)){if(card.classList.contains('is-reading-target'))window.misamoNavigate?.('home');window.MisamoVideo.release(card);card.remove();}});
    publicPosts.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).forEach(post=>{
      const existing=document.querySelector(`.post-card[data-post-id="${CSS.escape(post.id)}"]`);
      if(!existing)window.MisamoPosting.renderPost(post);
      else if(existing.dataset.cloudRevision!==String(post.revision))window.MisamoPosting.refreshPost(post);
      const card=document.querySelector(`.post-card[data-post-id="${CSS.escape(post.id)}"]`);
      if(card){card.dataset.cloudPost='';card.dataset.cloudRevision=String(post.revision);card.dataset.authorId=post.authorId;}
    });
    window.dispatchEvent(new CustomEvent('misamo:community-change',{detail:{kind:'cloud'}}));
  }
  async function refresh() {
    if(loading)return loading;
    message.textContent='공개 게시글 불러오는 중…';retry.hidden=true;
    loading=(async()=>{try{await cloud.load();paint();message.textContent=cloud.user?'공개 게시글 연결됨':'공개 게시글 · 작성하려면 로그인';}catch(e){message.textContent=e.message;retry.hidden=false;}finally{loading=null;window.dispatchEvent(new CustomEvent('misamo:cloud-loaded'));}})();
    return loading;
  }
  function authDialog() {
    window.MisamoCommunityUI.dialog(cloud.user?'내 계정':'미사모 로그인',(body,close)=>{
      const p=document.createElement('p');p.textContent=cloud.user?`로그인: ${cloud.user.email}`:'같은 계정으로 PC와 모바일에서 작성한 글을 관리하세요.';body.append(p);
      const status=document.createElement('p');status.setAttribute('role','status');
      if(cloud.user){const logout=document.createElement('button');logout.textContent='로그아웃';logout.type='button';logout.onclick=async()=>{if(migrationBusy)return;logout.disabled=true;const {error}=await client.auth.signOut();if(error){status.textContent='로그아웃하지 못했습니다.';logout.disabled=false;}else close();};body.append(status,logout);return;}
      const form=document.createElement('form');form.className='cloud-auth-form';
      function field(label,type,autocomplete){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type=type;i.autocomplete=autocomplete;i.required=true;l.append(i);form.append(l);return i;}
      const email=field('이메일','email','username');const password=field('비밀번호','password','current-password');password.minLength=8;
      const name=field('닉네임 (가입 시)','text','nickname');name.required=false;name.maxLength=40;
      const login=document.createElement('button');login.type='submit';login.textContent='로그인';
      const signup=document.createElement('button');signup.type='button';signup.textContent='새 계정 만들기';
      const info=document.createElement('p');info.textContent='가입 후 이메일 인증이 필요합니다. 비밀번호는 8자 이상으로 설정해주세요.';
      form.append(status,login,signup,info);body.append(form);
      async function submit(create){
        if(!form.reportValidity())return;
        login.disabled=signup.disabled=true;status.textContent='처리 중…';
        try{
          const credentials={email:email.value.trim(),password:password.value};
          const {data,error}=create?await client.auth.signUp({...credentials,options:{data:{display_name:name.value.trim()||'미사모 회원'}}}):await client.auth.signInWithPassword(credentials);
          if(error)throw error;
          if(data.session){cloud.setUser(data.session.user);close();paint();await refresh();}
          else status.textContent='인증 메일을 확인한 뒤 이 화면에서 로그인해주세요. 메일이 오지 않으면 관리자에게 이메일 발송 설정을 문의해주세요.';
        }catch(e){status.textContent=e.message==='Invalid login credentials'?'이메일 또는 비밀번호를 확인해주세요.':`인증하지 못했습니다: ${e.message}`;}
        finally{password.value='';login.disabled=signup.disabled=false;}
      }
      form.onsubmit=e=>{e.preventDefault();submit(false);};signup.onclick=()=>submit(true);
    });
  }
  account.onclick=authDialog;
  migrate.onclick=()=>{
    if(!cloud.user){authDialog();return;}
    window.MisamoCommunityUI.dialog('기존 게시글 옮기기',(body,close)=>{
      const intro=document.createElement('p');intro.textContent='선택한 글과 첨부 파일을 전체 공개로 올립니다. PC 원본은 삭제하지 않습니다. 50MB를 넘는 영상이 있는 글은 보존하고 건너뜁니다.';body.append(intro);
      const entries=localPosts();const list=document.createElement('div');list.className='cloud-migration-list';
      const checks=entries.map(post=>{const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;const text=document.createElement('span');text.textContent=post.title||'제목 없음';label.append(checkbox,text);list.append(label);return {post,checkbox,text};});body.append(list);
      const status=document.createElement('p');status.setAttribute('role','status');const start=document.createElement('button');start.type='button';start.textContent='선택한 글 공개 이전';const done=document.createElement('button');done.type='button';done.textContent='닫기';done.onclick=()=>{if(!migrationBusy)close();};body.append(status,start,done);
      start.onclick=async()=>{
        if(migrationBusy)return;
        const selected=checks.filter(c=>c.checkbox.checked && !c.checkbox.disabled);if(!selected.length){status.textContent='이전할 글을 선택해주세요.';return;}
        migrationBusy=true;start.disabled=done.disabled=true;let success=0,failed=0;
        try{for(const item of selected){item.checkbox.disabled=true;status.textContent=`${success+failed+1}/${selected.length} 이전 중…`;
          try{await cloud.publish(item.post,{legacyId:item.post.id});success++;item.text.textContent=`완료 · ${item.post.title}`;}
          catch(e){failed++;item.checkbox.disabled=false;item.text.textContent=`${item.post.title} — ${e.message}`;}
        }}finally{migrationBusy=false;start.disabled=done.disabled=false;status.textContent=`${success}개 완료 · ${failed}개 미완료. PC 원본은 그대로 있습니다.`;paint();await refresh();}
      };
    });
  };
  retry.onclick=refresh;
  window.addEventListener('misamo:cloud-change',paint);
  window.addEventListener('focus',()=>{if(!migrationBusy)refresh();});
  client.auth.onAuthStateChange((_event,session)=>{cloud.setUser(session?.user||null);setTimeout(()=>{paint();refresh();},0);});
  cloud.ready=(async()=>{const {data:{session}}=await client.auth.getSession();cloud.setUser(session?.user||null);await refresh();})();
  cloud.openAccount=authDialog;
})();
