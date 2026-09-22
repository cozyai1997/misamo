# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [styles.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/styles.css)
- [ui-polish.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/ui-polish.css)
- [posting.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.css)
- [posting-video.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting-video.css)
- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)

## 검증 자료

- [tests/posting-media-ui.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-media-ui.test.cjs)
- [tests/posting-inline.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-inline.test.cjs)
- [tests/mobile-navigation.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/mobile-navigation.test.cjs)

## 이식 시 주의

미사모의 고정 사용자, 로컬 저장 키, 텍스트·색상·개수 제한은 제품별 설정이다. 소스를 참고해도 기존 프로젝트 구조에 맞게 적용한다.

## 요청 예시

`Use $misamo-ui-state-design. 기존 디자인을 유지하면서 아이콘 대칭과 실제 활성 상태 표시를 정리해줘.`
