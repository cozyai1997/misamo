---
name: misamo-video-upload
description: "Implement browser video attachment validation and playback lifecycle, especially mobile metadata loading, file-type normalization, size/duration limits, and recoverable storage failures."
---

# 모바일 영상 첨부와 검증

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 먼저 서버 업로드인지 브라우저 내 시제품인지 결정한다. 서버가 있으면 기존 업로드·인증·객체 저장소 구조를 사용한다. IndexedDB 저장은 다른 사용자에게 공개되는 업로드가 아니다.

2. accept는 선택 안내이며 검증 자체가 아니다. 허용 MIME을 확인하고, MIME이 비었거나 application/octet-stream일 때만 허용 확장자로 보완한다. 실제 영상 메타데이터를 읽어 양수·유한한 가로/세로/길이를 확인한다. 확장자를 바꿨다는 이유만으로 파일을 신뢰하지 않는다.

3. 모바일에서 loadeddata가 오지 않을 수 있으므로 첫 프레임 디코딩을 첨부 완료의 필수 조건으로 삼지 않는다. metadata preload와 loadedmetadata를 사용하고 오류·타임아웃을 처리한다. canPlayType의 빈 응답만으로 실제 파일 검사를 생략하지 않는다. 메타데이터 성공은 전체 디코딩 성공의 증거가 아니므로 플레이어 오류도 표시한다.

4. 용량은 파일을 읽기 전에, 길이는 메타데이터 확인 후 저장 전에 검사한다. 최대값은 포함하고 초과값은 거절한다. 권장 코덱 안내와 실제 코덱 강제 검사·트랜스코딩은 별개다. 후자가 필요하면 서버/미디어 분석 도구로 따로 구현한다.

5. IndexedDB는 요청 성공이 아니라 transaction.oncomplete에서 저장 성공을 확정한다. 실패·교체·화면 이동 때 기존 첨부와 초안을 보존하고 오래된 비동기 결과를 generation/token으로 무효화한다. Blob URL은 화면 제거·오류 시 해제한다.

6. 자동재생 여부를 제품 정책에 맞추고, 다른 항목 이동·탭 숨김·모달 종료 시 재생을 중지한다. 피드 crop과 전체화면 contain을 구분해 원본 비율이 확대 중 왜곡되지 않게 한다.

## 검증

MIME 없는 MP4/MOV, 일반 바이너리 MIME, 손상/오디오 전용 파일, 메타데이터만 도착하는 상황, 용량·길이 경계, quota/차단, 교체 중 이동, 새로고침 후 복원, 원본 비율 전체화면을 검사한다. 제한값 모의 테스트와 실제 대용량·실기기 테스트를 구분한다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
