# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [api/link-preview.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/api/link-preview.js)
- [lib/link-preview.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/lib/link-preview.cjs)
- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)
- [post-content.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/post-content.js)

## 검증 자료

- [tests/link-preview.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/link-preview.test.cjs)
- [tests/posting-inline.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-inline.test.cjs)

## 이식 시 주의

미사모 예시 제한: 전체 5초, HTML 512KiB, 최대 3회 리다이렉트, 카드 너비 최대 480px. 환경별로 조정 가능하지만 상한과 실패 처리는 유지한다.

## 요청 예시

`Use $misamo-link-preview. 본문에 URL을 붙이면 안전한 링크 카드가 생기고 수정·이동·실행 취소도 되게 해줘.`
