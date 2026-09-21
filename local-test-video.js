(function () {
  'use strict';
  if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
  const store = window.MisamoStore;
  if (!store) return;
  const sample = {
    id: 'local-video-catchcatch-20260921', authorId: 'demo-me',
    author: store.USER?.name || 'misamo_korea', avatar: store.USER?.avatar || '',
    createdAt: '2026-09-21T09:00:00.000Z',
    title: '짧은 영상으로 시선을 끄는 법 — 숏폼 레퍼런스',
    bodyText: '우리 가게의 첫인상도 짧은 영상으로 전할 수 있을까요?\n첨부한 Catch Catch 클립을 숏폼 콘텐츠의 참고 예시로 올려봅니다. 짧은 시간 안에 동작과 분위기가 이어지는 모습을 보면서, 매장 소개 영상에도 어떤 장면을 먼저 보여줄지 생각해보면 좋겠어요.\n카페라면 음료가 완성되는 순간, 작은 브랜드라면 제품을 포장하는 과정처럼 우리만의 장면을 담아볼 수 있겠죠. 여러분은 가게를 소개할 때 어떤 순간을 보여주고 싶으세요?\n영상 기능을 확인하기 위해 제공받은 클립을 첨부한 테스트 게시글입니다.',
    bodyHtml: '<p>우리 가게의 첫인상도 짧은 영상으로 전할 수 있을까요?</p><p>첨부한 Catch Catch 클립을 숏폼 콘텐츠의 참고 예시로 올려봅니다. 짧은 시간 안에 동작과 분위기가 이어지는 모습을 보면서, 매장 소개 영상에도 어떤 장면을 먼저 보여줄지 생각해보면 좋겠어요.</p><p>카페라면 음료가 완성되는 순간, 작은 브랜드라면 제품을 포장하는 과정처럼 우리만의 장면을 담아볼 수 있겠죠. 여러분은 가게를 소개할 때 어떤 순간을 보여주고 싶으세요?</p><p>영상 기능을 확인하기 위해 제공받은 클립을 첨부한 테스트 게시글입니다.</p>',
    type: '정보 공유', category: '마케팅', industry: '',
    tags: ['숏폼', '콘텐츠마케팅', '영상테스트'], images: [], coverId: '', visibility: 'local',
    video: {
      id: 'sample-catchcatch', source: 'asset', src: 'assets/local-test-media/yena-catchcatch.mp4',
      name: 'Catch my heart with #KARINA #최예나 #YENA #aespa #YENA_CatchCatch.mp4',
      mime: 'video/mp4', size: 2740817, width: 720, height: 1280, duration: 19.747075, ratio: '4:3',
    },
  };
  const getPosts = store.getPosts.bind(store);
  store.getPosts = function () {
    const posts = getPosts();
    return posts.some(post => post.id === sample.id) ? posts : [...posts, JSON.parse(JSON.stringify(sample))];
  };
})();
