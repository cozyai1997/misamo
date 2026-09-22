# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [comments.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/comments.js)
- [comments.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/comments.css)
- [post-store.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/post-store.js)

## 검증 자료

- [tests/comments-inline.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/comments-inline.test.cjs)
- [tests/post-store.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/post-store.test.cjs)

## 이식 시 주의

미사모 예시 수량: 첫 댓글 2개, 이후 댓글/답글 10개씩. 다른 사이트의 고정 요구사항이 아니다.

## 요청 예시

`Use $misamo-threaded-comments. 평소 접힌 댓글을 아이콘으로 열고 답글을 나눠 불러오면서 작성 중인 입력을 보존해줘.`
