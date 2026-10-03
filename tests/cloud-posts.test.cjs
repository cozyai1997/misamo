const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createCloudPosts}=require('../cloud-posts.js');
require('../cloud-media.js');
const {createMisamoStore}=require('../post-store.js');
const video=require('../video-media.js');
function setup(){
  const rows=[],memory=new Map();let failInsert=false;let uploads=0;
  const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const local=createMisamoStore(storage);
  function query(){let conditions=[],mode='select',value,range=[0,99];
    const q={select:()=>q,eq:(k,v)=>{conditions.push([k,v]);return q;},order:()=>q,range:(a,b)=>{range=[a,b];return q;},insert:v=>{mode='insert';value=v;return q;},update:v=>{mode='update';value=v;return q;},maybeSingle:()=>run(true),then:(a,b)=>run(false).then(a,b)};
    async function run(single){
      if(mode==='insert'){if(failInsert)return {data:null,error:{message:'offline'}};const row={...value,created_at:value.created_at||new Date().toISOString(),deleted:false};rows.push(row);return {data:row,error:null};}
      const found=rows.filter(row=>conditions.every(([k,v])=>row[k]===v));
      if(mode==='update')found.forEach(row=>Object.assign(row,value));
      return {data:single?found[0]||null:found.slice(range[0],range[1]+1),error:null};
    }return q;
  }
  const client={from:query,storage:{from:()=>({upload:async()=>{uploads++;return {error:null}},getPublicUrl:path=>({data:{publicUrl:`https://jkyuqkxypkjnyjrcoxxk.supabase.co/storage/v1/object/public/post-media/${path}`}})})}};
  const config={bucket:'post-media',maxUploadBytes:50*1024*1024};
  const cloud=createCloudPosts({client,config,storage,video,content:{sanitizeHtml:s=>s},validate:local.validateDraft});
  const user={id:randomUUID(),user_metadata:{display_name:'작성자'}};cloud.setUser(user);
  return {cloud,rows,memory,local,storage,client,config,user,setFail:v=>{failInsert=v},get uploads(){return uploads}};
}
const draft=()=>({title:'기기 간 공개 글',bodyText:'본문',bodyHtml:'<p>본문</p>',images:[],tags:[]});
test('signed out or anonymous visitors cannot publish',async()=>{const s=setup();s.cloud.setUser(null);await assert.rejects(s.cloud.publish(draft()),/로그인/);s.cloud.setUser({id:randomUUID(),is_anonymous:true});await assert.rejects(s.cloud.publish(draft()),/로그인/);assert.equal(s.rows.length,0)});
test('migration preserves local original and is idempotent across client restart',async()=>{const s=setup();const original=s.local.publish(draft());const before=s.storage.getItem('misamo.prototype.v1');const a=await s.cloud.publish(original,{legacyId:original.id});assert.equal(a.id,original.id);assert.equal(a.authorId,s.user.id);assert.equal(s.storage.getItem('misamo.prototype.v1'),before);const b=await s.cloud.publish(original,{legacyId:original.id});assert.equal(a.id,b.id);assert.equal(s.rows.length,1);assert.equal(s.cloud.isMigrated(original.id),true);});
test('failed publication keeps draft and retry uses same durable operation',async()=>{const s=setup();s.local.saveDraft(draft());const before=s.storage.getItem('misamo.prototype.v1');s.setFail(true);await assert.rejects(s.cloud.publish(draft()),/保存|저장/);assert.equal(s.storage.getItem('misamo.prototype.v1'),before);const pending=JSON.parse(s.storage.getItem('misamo.cloud.migration.v1')).pending;const id=Object.values(pending)[0];s.setFail(false);const result=await s.cloud.publish(draft());assert.equal(result.id,id);assert.equal(s.rows.length,1);assert.equal(s.storage.getItem('misamo.prototype.v1'),before);});
test('server response lost after publish can be retried without duplicate',async()=>{const s=setup();await s.cloud.publish(draft());await s.cloud.publish(draft());assert.equal(s.rows.length,1);s.cloud.finishPublish();await s.cloud.publish(draft());assert.equal(s.rows.length,2)});
test('large legacy video fails before photos upload and leaves original available',async()=>{const s=setup();const value={...draft(),images:[{id:'photo',src:'data:image/png;base64,YQ=='}],video:{id:'v',source:'indexeddb',name:'clip.mp4',mime:'video/mp4',size:51*1024*1024,width:1080,height:1920,duration:20,ratio:'9:16'}};s.local.saveDraft(value);await assert.rejects(s.cloud.publish(value),/50MB/);assert.equal(s.uploads,0);assert.equal(s.local.readDraft().video.size,value.video.size);assert.equal(s.rows.length,0)});
test('remote media restricts host, bucket, path and protocol',()=>{const base='https://jkyuqkxypkjnyjrcoxxk.supabase.co/storage/v1/object/public/post-media/';const url=base+[randomUUID(),randomUUID(),randomUUID()+'.mp4'].join('/');assert.equal(global.MisamoCloudMedia.safeSource(url),true);for(const bad of [url.replace('https:','http:'),url.replace('post-media','private'),url.replace('.supabase.co','.supabase.co.evil.test'),url+'?secret=value','javascript:alert(1)'])assert.equal(global.MisamoCloudMedia.safeSource(bad),false);assert.ok(video.cleanVideo({id:'v',source:'cloud',src:url,name:'v.mp4',mime:'video/mp4',size:1,width:1,height:1,duration:1,ratio:'1:1'}));});
test('stale edit fails without overwriting a newer revision; soft deletion removes feed post',async()=>{const s=setup();const p=await s.cloud.publish(draft());await s.cloud.publish({...draft(),title:'최신 수정'},{editing:p});await assert.rejects(s.cloud.publish({...draft(),title:'오래된 수정'},{editing:p}),/다른 기기/);assert.equal(s.rows[0].payload.title,'최신 수정');await s.cloud.load();await s.cloud.remove(s.cloud.posts()[0]);assert.equal(s.cloud.posts().length,0);assert.equal(s.rows[0].deleted,true);});
test('clean second client reads published data without original browser state',async()=>{const s=setup();const published=await s.cloud.publish(draft());const clean=createCloudPosts({client:s.client,config:s.config,storage:{getItem:()=>null,setItem:()=>{}},video,content:{sanitizeHtml:s=>s},validate:s.local.validateDraft});await clean.load();assert.equal(clean.posts()[0].id,published.id);assert.equal(clean.posts()[0].bodyText,'본문');assert.equal(clean.isOwner(published),false);});
