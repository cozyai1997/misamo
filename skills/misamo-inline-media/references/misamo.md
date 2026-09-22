# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [editor-media.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/editor-media.js)
- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)
- [post-content.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/post-content.js)
- [posting-video.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting-video.css)

## 검증 자료

- [tests/editor-video.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/editor-video.test.cjs)
- [tests/inline-video-content.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/inline-video-content.test.cjs)
- [tests/posting-formats.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-formats.test.cjs)
- [tests/posting-media-ui.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-media-ui.test.cjs)

## 이식 시 주의

미사모의 고정 사용자, 로컬 저장 키, 텍스트·색상·개수 제한은 제품별 설정이다. 소스를 참고해도 기존 프로젝트 구조에 맞게 적용한다.

## 요청 예시

`Use $misamo-inline-media. 본문 중간에 사진과 영상을 넣고 각자 비율을 유지하면서 대표 미리보기를 고를 수 있게 해줘.`
