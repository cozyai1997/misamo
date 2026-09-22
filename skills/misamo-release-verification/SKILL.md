---
name: misamo-release-verification
description: "Release an authorized website change to its intended Git repository and hosting project, verifying remote commit, deployment readiness, production alias, and delivered assets separately."
---

# GitHub 커밋과 운영 배포 검증

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 사용자가 지정한 저장소·브랜치·호스팅 프로젝트를 확인한다. 이 스킬 사용만으로 push·운영 배포 권한이 생기지 않는다. 이미 요청에 포함된 승인을 불필요하게 다시 묻지 않는다.

2. git status·diff와 프로젝트 지침을 읽고 기존 작업을 보존한다. 비밀 환경 파일, 인증서, 원본 테스트 미디어, 작업 로그·백업은 앱 배포에서 제외한다. 스킬 문서처럼 런타임에 필요 없는 자료도 공개 웹 산출물과 분리한다.

3. 변경에 맞는 검증을 실행하고 통과한 명령·범위를 기록한다. jsdom 단위 검사, 브라우저 상호작용, 실기기 결과를 섞지 않는다. 문서만 바뀌었으면 앱 전체 재배포가 필요한지 따로 판단한다.

4. 커밋 후 push 결과와 원격 branch SHA를 확인한다. 충돌 시 사용자의 변경을 강제 덮어쓰지 않는다. Vercel을 쓰면 .vercel/project.json의 team/project ID가 대상과 맞는지 확인한 뒤 요청된 preview 또는 production에 배포한다.

5. READY 상태만 보지 말고 배포 commit SHA·target·alias를 확인한다. 공개 주소에서 실제 최신 HTML/JS/CSS를 조회해 커밋 산출물과 비교하고 대표 UI 동작을 확인한다. 이전 배포 READY를 새 변경 완료로 보고하지 않는다.

6. 보호된 preview는 제공자의 인증된 조회 도구로 검사한다. 접근 보호를 약화시켜 테스트하지 않는다. 실패 지점이 commit/push/build/alias/runtime 중 어디인지 구분해 보고한다.

## 검증

작업 트리 범위, 비밀·테스트 자료 제외, 원격 SHA, 정확한 호스팅 프로젝트, 새 배포 READY, 별칭 연결, 운영 파일 일치와 실제 화면을 확인한다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
