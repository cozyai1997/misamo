const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname,'..');
function boot(hash='#home') {
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://misamo.test/'+hash,runScripts:'outside-only'});
  const w=dom.window; w.CSS={escape:String}; w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=()=>{};
  const body='<p>'+('여러 시간대의 거리를 방문해 보았습니다. '.repeat(25))+'</p><h3>마지막 문단</h3><p>끝까지 보이는 본문입니다.</p>';
  w.localStorage.setItem('misamo.prototype.v1',JSON.stringify({version:1,draft:null,posts:[{id:'integration-post',title:'긴 글 통합 확인',bodyText:'긴 글',bodyHtml:body,createdAt:new Date().toISOString()}],threads:{},likes:{}}));
  for(const script of w.document.querySelectorAll('script[src]')) {
    const src=script.getAttribute('src'); if(src.startsWith('./')) w.eval(fs.readFileSync(path.join(root,src.slice(2).split('?')[0]),'utf8'));
  }
  return dom;
}
test('real page script order keeps authored post, bookmark, reading and inline comments working together',()=>{
  const dom=boot();
  try {
    const w=dom.window, doc=w.document, post=doc.querySelector('[data-post-id="integration-post"]');
    const input=post.querySelector('.comments-compose textarea'); assert.ok(input);
    input.value='저장 전 댓글'; input.dispatchEvent(new w.Event('input',{bubbles:true}));
    post.querySelector('[data-reading-toggle]').click(); post.querySelector('[data-bookmark-button]').click();
    post.querySelector('[data-comments-open]').click(); post.querySelector('[data-comments-open]').click();
    assert.equal(input.value,'저장 전 댓글'); assert.equal(post.querySelector('.post-rich-body').hidden,false);
    assert.equal(post.querySelector('[data-bookmark-button]').getAttribute('aria-pressed'),'true');
    post.querySelector('.comments-compose').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(w.MisamoStore.readComments('integration-post').comments[0].text,'저장 전 댓글');
    assert.ok(w.MisamoStore.getBookmarks().includes('integration-post'));
  } finally { dom.window.close(); }
});
test('direct post URL restores full reading after a fresh load and missing local posts show guidance',()=>{
  for(const id of ['integration-post','missing-post']) {
    const dom=boot('#post/'+id);
    try {
      const w=dom.window,doc=w.document;
      assert.equal(w.location.hash,'#post/'+id); assert.ok(doc.body.classList.contains('is-reading-post'));
      if(id==='integration-post') assert.equal(doc.querySelector('.is-reading-target .post-rich-body').hidden,false);
      else assert.equal(doc.querySelector('.reading-notice').hidden,false);
    } finally {dom.window.close();}
  }
});
