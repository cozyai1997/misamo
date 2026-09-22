# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [video-media.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/video-media.js)
- [video-media.css](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/video-media.css)
- [posting.js](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/posting.js)

## 검증 자료

- [tests/video-media.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/video-media.test.cjs)
- [tests/video-data.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/video-data.test.cjs)
- [tests/posting-video.test.cjs](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/tests/posting-video.test.cjs)

## 이식 시 주의

미사모 기본값: 1개, 1GB=1,073,741,824바이트, 300초. MP4·MOV 권장, H.264/HEVC + AAC 권장, 기존 WebM 호환. 비율 4:3·1:1·9:16·16:9. 이 값들은 다른 제품에서 다시 정하며 기기 저장 용량이나 코덱 지원을 보장하지 않는다. 기존 장시간 영상 읽기를 유지하려고 길이 제한은 신규 import에 적용한다.

## 요청 예시

`Use $misamo-video-upload. 모바일에서도 영상 첨부가 멈추지 않도록 파일 검사·저장·재생 흐름을 구현해줘.`
