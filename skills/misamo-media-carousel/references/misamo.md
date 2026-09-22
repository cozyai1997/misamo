# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [media-carousel.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/media-carousel.js)
- [media-carousel.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/media-carousel.css)
- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)

## 검증 자료

- [tests/media-carousel.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/media-carousel.test.cjs)
- [tests/carousel-reorder.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/carousel-reorder.test.cjs)
- [tests/posting-formats.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-formats.test.cjs)

## 이식 시 주의

미사모의 고정 사용자, 로컬 저장 키, 텍스트·색상·개수 제한은 제품별 설정이다. 소스를 참고해도 기존 프로젝트 구조에 맞게 적용한다.

## 요청 예시

`Use $misamo-media-carousel. 사진과 영상을 함께 넘겨보고 숫자나 드래그로 순서를 바꾸는 첨부 영역을 만들어줘.`
