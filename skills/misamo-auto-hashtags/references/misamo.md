# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)
- [post-store.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/post-store.js)
- [community-data.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/community-data.js)

## 검증 자료

- [tests/posting-body-tags.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-body-tags.test.cjs)

## 이식 시 주의

미사모 태그 칩 최대 10개는 예시 값이다. 자동 제외 메타데이터는 실제 태그 목록과 따로 보관한다.

## 요청 예시

`Use $misamo-auto-hashtags. 본문의 해시태그를 태그 목록에 자동 등록하고 칩을 지워도 원문은 그대로 남겨줘.`
