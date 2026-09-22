# 미사모 iPhone 테스트 앱

현재 운영 사이트 https://misamo-indol.vercel.app/ 를 WKWebView로 여는 iPhone 전용 테스트 앱입니다. 인터넷 연결이 필요합니다. 앱 내부 브라우저의 localStorage/IndexedDB를 유지하며 Safari와 저장소를 공유하지 않습니다. 이미지·영상 선택은 iOS 기본 파일 선택기를 사용합니다.

- 최소 iOS: 16.0
- 표시 이름: 미사모
- Bundle ID 준비값: `com.cozyai1997.misamo.beta` (Apple 등록 가능 여부 확인 필요)
- 버전: 0.1.0
- 빌드: GitHub Actions macOS + XcodeGen + Xcode

`iOS build verification`은 서명 없이 컴파일을 확인합니다. 생성된 `.app.zip`은 설치 파일이나 TestFlight 배포가 아닙니다.

## TestFlight 완료에 필요한 계정 단계

1. Apple Developer Program 가입 승인 및 App Store Connect 로그인 확인
2. 계정의 Team ID 확인, Bundle ID 등록 및 앱 레코드 생성
3. 배포 인증서·프로비저닝 프로파일과 업로드 인증을 안전한 비밀 저장소로 설정
4. 서명된 archive/IPA 빌드 후 App Store Connect 업로드
5. TestFlight 처리 및 필요한 베타 심사 후 테스터 초대 링크 발급

비밀번호, API 개인키, 배포 인증서 등은 Git에 커밋하지 않습니다. 현재 웹앱의 사용자·게시글은 로컬 시제품이므로 테스트 설명에도 이를 명시해야 합니다. 실제 기기에서 사진·영상 선택, 재생, 키보드, 앱 재실행 후 초안 복원, 외부 링크 및 오프라인 복구 확인이 필요합니다.
