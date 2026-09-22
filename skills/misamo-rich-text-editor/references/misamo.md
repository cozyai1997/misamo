# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)
- [posting.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.css)
- [editor-media.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/editor-media.js)

## 검증 자료

- [tests/posting-inline.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-inline.test.cjs)
- [tests/editor-media.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/editor-media.test.cjs)

## 이식 시 주의

미사모의 고정 사용자, 로컬 저장 키, 텍스트·색상·개수 제한은 제품별 설정이다. 소스를 참고해도 기존 프로젝트 구조에 맞게 적용한다.

## 요청 예시

`Use $misamo-rich-text-editor. 긴 글에서도 도구 모음이 보이고 서식 상태와 실행 취소가 정확한 게시글 편집기를 구현해줘.`
