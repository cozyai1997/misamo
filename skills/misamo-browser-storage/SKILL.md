---
name: misamo-browser-storage
description: "Design recoverable browser-local prototype storage for drafts, posts, and media with schema compatibility, transactional writes, and clear server-migration boundaries."
---

# 초안·게시글·미디어 저장

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 프로젝트의 실제 영속 계층부터 확인한다. 브라우저 시제품에서는 텍스트/메타데이터를 localStorage, 큰 바이너리를 IndexedDB로 분리할 수 있다. 이미 있는 서버 DB를 로컬 저장소로 대체하지 않는다.

2. schema version과 정규화 경계를 정한다. 새 필드를 넣을 때 기존 게시글·댓글·좋아요·초안을 유지하고, 읽기 실패를 빈 상태로 간주해 덮어쓰지 않는다. 외부에 반환한 객체 변경이 저장 상태를 직접 바꾸지 않게 한다.

3. 영상 Blob을 먼저 저장하고 성공한 ID만 초안에 연결한다. Blob URL은 런타임 주소다. localStorage와 IndexedDB 사이에는 단일 원자적 transaction이 없으므로 중간 실패와 고아 Blob 정리 정책을 별도로 다룬다.

4. 발행 시 게시글 추가와 초안 비우기를 가능한 한 같은 메타데이터 쓰기로 처리한다. 교체·발행 실패에는 복원 가능한 기존 초안을 남긴다. 파일을 삭제하기 전에 다른 글·초안·undo 참조 여부를 고려한다.

5. origin, 브라우저, 기기, Safari와 앱 웹뷰의 저장소는 같다고 가정하지 않는다. 서버로 전환할 때 인증 ID 매핑, 원본 업로드, 재시도·중복 방지·권한 확인을 설계하고 로컬 자료가 자동 이동했다고 말하지 않는다.

## 검증

손상 JSON, schema 누락, 저장 차단, quota, IndexedDB abort, 오래된 레코드, 발행 실패, 별도 origin·탭, 교체된 영상 복원을 검사한다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
