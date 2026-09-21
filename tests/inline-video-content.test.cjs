const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { createMisamoContent } = require('../post-content.js');
const { cleanVideo } = require('../video-media.js');

const videoRecord = {
  id: 'inline-video_1', source: 'asset', src: 'assets/local-test-media/sample.mp4',
  name: '현장 영상.mp4', mime: 'video/mp4', size: 1200, width: 720, height: 1280,
  duration: 12, ratio: '9:16'
};

function setup(t) {
  const dom = new JSDOM('');
  t.after(() => dom.window.close());
  const { document } = dom.window;
  const content = createMisamoContent(document);
  const calls = [], released = [];
  dom.window.MisamoVideo = {
    cleanVideo,
    createFigure(record) {
      calls.push(record);
      const figure = document.createElement('figure');
      figure.className = 'misamo-video'; figure.dataset.videoId = record.id;
      const video = document.createElement('video');
      video.src = 'blob:https://example.test/transient-video'; video.controls = true;
      figure.append(video);
      return figure;
    },
    release(container) { released.push(container); }
  };
  const holder = document.createElement('div');
  document.body.append(holder);
  return { document, content, holder, calls, released };
}

test('inline video persists only its safe marker and drops rendered or injected contents', t => {
  const { content } = setup(t);
  const unsafe = '<p>영상 앞</p><div data-video-id="inline-video_1" class="x" data-align="right" style="position:fixed" contenteditable="true" onclick="bad()"><figure><video src="blob:private" poster="https://example.com/tracking"><source src="https://example.com/video.mp4"></video><figcaption>파일명과 설명</figcaption></figure><script>bad()</script><img data-image-id="nested" src="bad"><span>첨부 영상</span></div><p>영상 뒤</p>';
  assert.equal(content.sanitizeHtml(unsafe), '<p>영상 앞</p><div data-video-id="inline-video_1" data-align="right"></div><p>영상 뒤</p>');
});

test('invalid video IDs cannot persist and other tags cannot masquerade as video markers', t => {
  const { content } = setup(t);
  for (const id of ['', 'with space', 'a.b', '한글', 'a'.repeat(101)]) {
    assert.equal(content.sanitizeHtml(`<p>앞</p><div data-video-id="${id}">삭제할 내용</div><p>뒤</p>`), '<p>앞</p><p>뒤</p>');
  }
  assert.equal(content.sanitizeHtml('<p data-video-id="valid">글</p><span data-video-id="valid">문구</span>'), '<p>글</p>문구');
});

test('rendered placeholders keep their position but do not enter serialized body text', t => {
  const { content, holder } = setup(t);
  const saved = '<p>영상 앞</p><div data-video-id="inline-video_1"></div><p>영상 뒤</p>';
  holder.innerHTML = content.renderHtml(saved, []);
  const marker = holder.children[1];
  assert.equal(marker.className, 'posting-inline-video');
  assert.equal(marker.getAttribute('contenteditable'), 'false');
  assert.equal(marker.textContent, '첨부 영상');
  assert.equal(holder.querySelector('video'), null);
  assert.equal(content.sanitizeHtml(holder.innerHTML), saved);
  holder.innerHTML = content.sanitizeHtml(holder.innerHTML);
  assert.equal(holder.textContent, '영상 앞영상 뒤');
});

test('inline player mounts between paragraphs and hydrated markup serializes back to the marker', t => {
  const { content, holder, calls } = setup(t);
  const saved = '<p>작업 전</p><div data-video-id="inline-video_1"></div><p>작업 후</p>';
  holder.innerHTML = content.renderHtml(saved, []);
  assert.equal(content.mountInlineVideo(holder, videoRecord), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], cleanVideo(videoRecord));
  assert.deepEqual(Array.from(holder.children, node => node.tagName), ['P', 'DIV', 'P']);
  assert.equal(holder.children[0].textContent, '작업 전');
  assert.equal(holder.children[1].querySelector('video').getAttribute('src'), 'blob:https://example.test/transient-video');
  assert.equal(holder.children[1].getAttribute('contenteditable'), 'false');
  assert.equal(holder.children[2].textContent, '작업 후');
  assert.equal(content.sanitizeHtml(holder.innerHTML), saved);
});

test('only the first exact matching inline marker can mount a player', t => {
  const { content, holder, calls } = setup(t);
  holder.innerHTML = '<div data-video-id="other">잘못된 영상</div><p>앞</p><div data-video-id="inline-video_1"></div><p>중간</p><div data-video-id="inline-video_1"></div><div data-video-id="bad id"></div><p>뒤</p>';
  assert.equal(content.mountInlineVideo(holder, videoRecord), true);
  assert.equal(calls.length, 1);
  assert.equal(holder.querySelectorAll('div[data-video-id]').length, 1);
  assert.equal(holder.querySelectorAll('video').length, 1);
  assert.equal(holder.children[0].textContent, '앞');
  assert.equal(holder.children[1].dataset.videoId, videoRecord.id);
  assert.equal(holder.children[2].textContent, '중간');
  assert.equal(holder.children[3].textContent, '뒤');
});

test('missing or invalid video records remove stale markers without appending a player', t => {
  const { content, holder, calls } = setup(t);
  for (const record of [null, { ...videoRecord, id: 'different' }, { ...videoRecord, src: 'javascript:bad()' }]) {
    holder.innerHTML = '<p>앞</p><div data-video-id="inline-video_1">첨부 영상</div><p>뒤</p>';
    assert.equal(content.mountInlineVideo(holder, record), false);
    assert.equal(holder.innerHTML, '<p>앞</p><p>뒤</p>');
  }
  holder.innerHTML = '<p>기존 본문</p>';
  assert.equal(content.mountInlineVideo(holder, videoRecord), false);
  assert.equal(holder.innerHTML, '<p>기존 본문</p>');
  assert.equal(calls.length, 0);
});

test('remounting releases the previous player and accepts a validated display ratio', t => {
  const { content, holder, calls, released } = setup(t);
  holder.innerHTML = '<div data-video-id="inline-video_1"></div>';
  content.mountInlineVideo(holder, videoRecord);
  const marker = holder.firstElementChild;
  released.length = 0;
  assert.equal(content.mountInlineVideo(holder, videoRecord, { ratio: '4:3' }), true);
  assert.equal(calls.at(-1).ratio, '4:3');
  assert.ok(released.includes(marker));
  assert.equal(holder.querySelectorAll('video').length, 1);
  assert.equal(content.sanitizeHtml(holder.innerHTML), '<div data-video-id="inline-video_1"></div>');
});

test('inline video alignment survives rendering and ratio remounts while runtime ratio and controls are stripped', t => {
  const { content, holder } = setup(t);
  for (const alignment of ['left', 'center', 'right']) {
    const saved = `<div data-video-id="inline-video_1" data-align="${alignment}"></div>`;
    holder.innerHTML = content.renderHtml(saved, []);
    content.mountInlineVideo(holder, videoRecord);
    content.mountInlineVideo(holder, videoRecord, { ratio:'16:9' });
    const marker = holder.firstElementChild;
    assert.equal(marker.dataset.align, alignment);
    assert.equal(marker.dataset.videoRatio, '16:9');
    assert.equal(marker.style.marginLeft, alignment === 'left' ? '0px' : 'auto');
    assert.equal(marker.style.marginRight, alignment === 'right' ? '0px' : 'auto');
    assert.equal(content.sanitizeHtml(holder.innerHTML), saved);
  }
  assert.equal(content.sanitizeHtml('<div data-video-id="inline-video_1" data-align="stretch"></div>'), '<div data-video-id="inline-video_1"></div>');
});
