---
name: misamo-ios-webview-shell
description: "Prepare a SwiftUI/WKWebView shell around an existing website and separate unsigned build verification from signing, TestFlight upload, and real-device acceptance."
---

# iPhone 웹뷰 테스트 앱 준비

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 기존 사이트를 앱 웹뷰로 감싸는 것이 요구인지 먼저 확인한다. 웹뷰를 네이티브 기능 구현이나 App Store 심사 통과의 보장으로 제시하지 않는다.

2. 앱 이름·사이트 origin·Bundle ID·최소 iOS를 대상에 맞춰 정한다. WKWebsiteDataStore.default로 세션 영속성을 선택하되 Safari의 localStorage/IndexedDB와 공유된다고 가정하지 않는다.

3. 인라인 미디어 재생과 사용자 제스처 정책, safe area, 사이트 스와이프와 웹뷰 뒤로 가기의 충돌을 검토한다. 파일 선택은 지원되는 iOS 기본 흐름을 우선하고 실제 기기로 사진·영상 선택을 검증한다.

4. 동일 origin 내부 이동과 외부 링크를 구분한다. 허용 scheme을 좁히고 target=_blank 및 alert/confirm/prompt를 처리한다. 오프라인·탐색 실패에서 재시도 화면을 제공한다.

5. 서명 없는 Xcode 빌드는 컴파일 검증이다. 설치·TestFlight를 요청하면 Apple 계정/Team/Bundle ID/서명·프로비저닝/서명 archive·업로드/처리·심사/테스터 접근을 각각 확인한다. 인증서·개인키·프로파일은 Git에 넣지 않는다.

## 검증

준비된 소스, CI 빌드 성공, 서명된 IPA, App Store Connect 처리, 실제 TestFlight 설치를 별도 상태로 보고한다. 실기기에서 파일 선택·재생·키보드·재시작 후 초안·외부 링크·오프라인 복구를 확인한다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
