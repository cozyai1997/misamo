const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { createMisamoContent } = require('../post-content.js');
const { publicIPv4, validateUrl, metadata, getPreview } = require('../lib/link-preview.cjs');

test('preview rejects private, reserved and disguised addresses', () => {
  for (const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.1.1','192.168.1.1','100.64.1.1','0.0.0.0','224.0.0.1','192.0.2.1','198.18.0.1']) assert.equal(publicIPv4(ip), false, ip);
  assert.equal(publicIPv4('8.8.8.8'), true);
  for (const url of ['http://example.com','https://user:pass@example.com','https://example.com:444','https://127.1','https://[::1]']) assert.throws(() => validateUrl(url));
});

test('metadata reads OG attributes and entities without executing markup', () => {
  const data = metadata('<title>Fallback</title><meta content="Hello &amp; world" property="og:title"><meta name="description" content="A &quot;test&quot;"><meta property="og:image" content="/photo.png">', 'https://example.com/page');
  assert.equal(data.title, 'Hello & world');
  assert.equal(data.description, 'A "test"');
  assert.equal(data.image, 'https://example.com/photo.png');
});

test('cards survive save/render and unsafe metadata cannot become markup', () => {
  const document = new JSDOM('').window.document;
  const content = createMisamoContent(document);
  const card = content.linkCard({url:'https://example.com/',title:'<img onerror=alert(1)>',description:'Description',image:'javascript:alert(1)'});
  const saved = content.sanitizeHtml(card);
  const rendered = content.renderHtml(saved, []);
  assert.equal(content.sanitizeHtml(rendered), saved);
  const holder = document.createElement('div'); holder.innerHTML = rendered;
  assert.equal(holder.querySelector('a').className, 'posting-link-card');
  assert.equal(holder.querySelector('img'), null);
  assert.match(holder.textContent, /<img onerror=alert\(1\)>/);
  assert.equal(holder.querySelector('a').rel, 'noopener noreferrer');
  assert.deepEqual(content.inlineImageIds(rendered), []);
});

test('DNS validation is repeated on redirects and rejects mixed public/private answers', async () => {
  let requests=0;
  await assert.rejects(getPreview('https://example.com',{resolve:async()=>['8.8.8.8','127.0.0.1'],read:async()=>{requests++;}}));
  assert.equal(requests,0);
  await assert.rejects(getPreview('https://example.com',{resolve:async host=>host==='example.com'?['8.8.8.8']:['10.0.0.1'],read:async(url,address)=>{requests++;assert.equal(address,'8.8.8.8');return {location:'https://internal.example/'};}}));
  assert.equal(requests,1);
});

test('redirect and image validation preserve only public metadata', async () => {
  const data=await getPreview('https://example.com',{resolve:async host=>host==='images.example'?['192.168.1.1']:['8.8.8.8'],read:async url=>url.pathname==='/'?{location:'/page'}:{html:'<title>Safe</title><meta property="og:image" content="https://images.example/a.png">'}});
  assert.equal(data.title,'Safe');assert.equal(data.image,'');assert.equal(data.url,'https://example.com/page');
});

test('malformed maximum-sized HTML does not cause parser backtracking', () => {
  const start=Date.now();
  for(const html of ['<script '.repeat(65536),'<script >'.repeat(58000),'<meta '.repeat(87000)]) {
    assert.equal(metadata(html,'https://example.com/').title,'example.com');
  }
  assert.ok(Date.now()-start<1000);
});
