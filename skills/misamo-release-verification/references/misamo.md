# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [package.json](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/package.json)
- [vercel.json](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/vercel.json)
- [.gitignore](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/.gitignore)
- [.vercelignore](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/.vercelignore)

## 검증 자료

전용 단위 테스트 대신 위 구성 파일과 스킬의 단계별 확인 기준을 사용한다. 구성 파일의 존재만으로 실행 성공을 주장하지 않는다.

## 이식 시 주의

미사모는 정적 HTML/JS/CSS와 Vercel Node API의 조합이다. npm test는 node --test --test-isolation=none tests/*.test.cjs를 실행한다. 다른 프로젝트에 이 명령·프로젝트 ID·브랜치를 그대로 적용하지 않는다.

## 요청 예시

`Use $misamo-release-verification. 현재 사이트 변경사항을 지정한 GitHub에 올리고 운영 배포가 실제 반영됐는지 확인해줘.`
