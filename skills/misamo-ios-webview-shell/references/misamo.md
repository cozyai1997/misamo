# 구현 출처

기준 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 아래는 구현 예시이며 대상 사이트의 요구사항이 아니다. 최신 브랜치와 차이가 있으면 먼저 현재 코드를 확인한다.

## 소스

- [mobile/ios/Sources/MisamoApp.swift](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/mobile/ios/Sources/MisamoApp.swift)
- [mobile/ios/project.yml](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/mobile/ios/project.yml)
- [mobile/ios/Info.plist](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/mobile/ios/Info.plist)
- [mobile/ios/README.md](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/mobile/ios/README.md)
- [.github/workflows/ios-build.yml](https://github.com/cozyai1997/misamo/blob/abceed54f8a443c8de08ebf07288efcca9270548/.github/workflows/ios-build.yml)

## 검증 자료

전용 단위 테스트 대신 위 구성 파일과 스킬의 단계별 확인 기준을 사용한다. 구성 파일의 존재만으로 실행 성공을 주장하지 않는다.

## 이식 시 주의

참조 시점 소스는 iPhone 테스트 셸과 서명 없는 macOS CI 구성이다. 이 스킬 작성에서 CI 실행·서명·TestFlight 배포를 새로 검증한 것은 아니다. Xcode/macOS 및 배포 계정 접근은 대상 환경에서 확인한다.

## 요청 예시

`Use $misamo-ios-webview-shell. 기존 사이트를 iPhone 웹뷰 테스트 앱으로 준비하고 빌드 검증과 TestFlight 배포 단계를 구분해줘.`
