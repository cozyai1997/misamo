const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const sourcePath = path.join(__dirname, '..', 'post-content.js');
const createMisamoContent = fs.existsSync(sourcePath) ? require(sourcePath).createMisamoContent : undefined;

function setup(t) {
  assert.equal(typeof createMisamoContent, 'function', 'the production content helper is available');
  const dom = new JSDOM('');
  t.after(() => dom.window.close());
  return { document: dom.window.document, content: createMisamoContent(dom.window.document) };
}

test('legacy paragraphs, headings, emphasis and lists keep their formatting', (t) => {
  const { content } = setup(t);
  const html = '<h2>제목</h2><p>첫 <strong>문단</strong><br><em>기울임</em> <u>밑줄</u></p><ul><li>항목</li></ul>';
  assert.equal(content.sanitizeHtml(html), html);
});

test('links keep HTTPS destinations only and cannot carry caller attributes', (t) => {
  const { content } = setup(t);
  assert.equal(
    content.sanitizeHtml('<a href="https://example.com" onclick="bad()" style="color:red">안전</a><a href="javascript:bad()">위험</a><a href="http://example.com">비암호화</a>'),
    '<a href="https://example.com/" target="_blank" rel="noopener noreferrer">안전</a>위험비암호화'
  );
});

test('active content is dropped while unsupported harmless wrappers retain text', (t) => {
  const { content } = setup(t);
  assert.equal(
    content.sanitizeHtml('<p class="x" onmouseover="bad()">앞</p><script>bad()</script><iframe>숨김</iframe><svg><text>숨김</text></svg><span>뒤</span>'),
    '<p>앞</p>뒤'
  );
});

test('image markers retain only a validated image id and never persist the encoded source', (t) => {
  const { content } = setup(t);
  const saved = content.sanitizeHtml('<p>앞</p><img data-image-id="image_1-a" src="data:image/png;base64,AQID" alt="caller" onerror="bad()" style="position:fixed"><p>뒤</p>');
  assert.equal(saved, '<p>앞</p><img data-image-id="image_1-a"><p>뒤</p>');
  assert.equal(saved.includes('base64'), false);
});

test('unkeyed images and malformed marker ids cannot enter saved content', (t) => {
  const { content } = setup(t);
  assert.equal(
    content.sanitizeHtml('<img src="https://example.com/x.png"><img data-image-id=""><img data-image-id="a b"><img data-image-id="a.b"><img data-image-id="' + 'a'.repeat(101) + '"><p data-image-id="not-image">글</p>'),
    '<p>글</p>'
  );
});

test('inlineImageIds reports unique valid markers in document order', (t) => {
  const { content } = setup(t);
  assert.equal(typeof content.inlineImageIds, 'function', 'marker extraction is available');
  assert.deepEqual(
    content.inlineImageIds('<img data-image-id="b"><img data-image-id="a"><img data-image-id="b"><img data-image-id="bad id"><span data-image-id="c">문구</span><svg><image data-image-id="d"></image></svg>'),
    ['b', 'a']
  );
});

test('rendering and saving preserve text-image-text order without copying image bytes', (t) => {
  const { content, document } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  const saved = '<p>첫 문단</p><img data-image-id="photo-1"><p>다음 문단</p>';
  const rendered = content.renderHtml(saved, [{ id: 'photo-1', src: 'data:image/png;base64,AQID', alt: '현장 사진' }]);
  const holder = document.createElement('div');
  holder.innerHTML = rendered;
  assert.deepEqual(Array.from(holder.children, (element) => element.tagName), ['P', 'IMG', 'P']);
  assert.equal(holder.children[0].textContent, '첫 문단');
  assert.equal(holder.children[1].getAttribute('src'), 'data:image/png;base64,AQID');
  assert.equal(holder.children[2].textContent, '다음 문단');
  assert.equal(content.sanitizeHtml(rendered), saved);
});

test('rendered image attributes come only from the image record and fixed display settings', (t) => {
  const { content, document } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  const holder = document.createElement('div');
  holder.innerHTML = content.renderHtml(
    '<img data-image-id="photo" src="https://example.com/track" alt="caller" class="unsafe" onclick="bad()" style="position:fixed" draggable="true">',
    [{ id: 'photo', src: 'data:image/jpeg;base64,AQID', alt: '\"><script>bad()</script>' }]
  );
  const image = holder.querySelector('img');
  assert.equal(image.getAttribute('src'), 'data:image/jpeg;base64,AQID');
  assert.equal(image.getAttribute('alt'), '\"><script>bad()</script>');
  assert.equal(image.className, 'posting-inline-image');
  assert.equal(image.draggable, false);
  assert.deepEqual(image.getAttributeNames().sort(), ['alt', 'class', 'data-image-id', 'draggable', 'src']);
  assert.equal(holder.querySelector('script'), null);
});

test('missing image references disappear without disturbing surrounding paragraphs', (t) => {
  const { content } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  assert.equal(content.renderHtml('<p>앞</p><img data-image-id="missing"><p>뒤</p>', []), '<p>앞</p><p>뒤</p>');
});

test('remote, active and malformed image sources cannot hydrate markers', (t) => {
  const { content } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  const rejectedSources = [
    'https://example.com/image.png',
    'javascript:bad()',
    'data:image/svg+xml;base64,AQID',
    'data:image/png;base64,',
    'data:image/png;base64,A',
    'data:image/png;base64,AQ===',
    'data:image/png;base64,AQID!'
  ];
  for (const src of rejectedSources) {
    assert.equal(content.renderHtml('<img data-image-id="photo">', [{ id: 'photo', src }]), '', src);
  }
});

test('all supported raster image formats render with valid base64 padding', (t) => {
  const { content, document } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  const records = [
    { id: 'jpeg', src: 'data:image/jpeg;base64,AQ==' },
    { id: 'png', src: 'data:image/png;base64,AQI=' },
    { id: 'webp', src: 'data:image/webp;base64,AQID' }
  ];
  const holder = document.createElement('div');
  holder.innerHTML = content.renderHtml('<img data-image-id="jpeg"><img data-image-id="png"><img data-image-id="webp">', records);
  assert.deepEqual(Array.from(holder.querySelectorAll('img'), (image) => image.getAttribute('src')), [
    'data:image/jpeg;base64,AQ==', 'data:image/png;base64,AQI=', 'data:image/webp;base64,AQID'
  ]);
});

test('legacy marker-free body does not implicitly append attachment images', (t) => {
  const { content } = setup(t);
  assert.equal(typeof content.renderHtml, 'function', 'image rendering is available');
  assert.equal(content.renderHtml('<p>이전 <b>글</b></p>', [{ id: 'legacy', src: 'data:image/png;base64,AQID' }]), '<p>이전 <b>글</b></p>');
  assert.deepEqual(content.inlineImageIds('<p>이전 <b>글</b></p>'), []);
});
