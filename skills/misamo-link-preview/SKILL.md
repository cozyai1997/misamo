---
name: misamo-link-preview
description: "Implement editable URL preview cards and a bounded server-side metadata fetcher, including URL normalization, SSRF defenses, redirect validation, and undo-safe replacement."
---

# 안전한 링크 카드

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 텍스트 링크와 카드 삽입을 구분한다. 빈 문단의 단독 URL은 카드 후보로 처리할 수 있지만 문장 속 URL을 자동으로 블록 카드로 바꾸지 않는다. 도메인만 입력한 주소의 HTTPS 보완은 제품 정책으로 명시한다.

2. 서버 fetch는 공개 HTTP 자원 조회 정책을 명확히 한다. 미사모는 HTTPS만 허용한다. 사용자정보 포함 URL·내부/예약 주소·불필요한 포트를 거절하고 DNS 결과를 검사한다. 검사한 IP로 실제 연결을 고정해 DNS 재해석 우회를 방지한다.

3. 리다이렉트마다 URL/DNS 검사를 다시 하고 전체 요청의 시간·바이트·리다이렉트 수를 제한한다. 현재 구현은 공개 IPv4만 허용한다. IPv6를 추가할 때 단순히 허용 범위를 넓히지 말고 해당 주소 범위도 검증한다.

4. 외부 HTML은 데이터로만 해석한다. 필요한 제목·설명·이미지 URL만 길이를 제한해 반환하고 임의 HTML/스크립트를 렌더링하지 않는다. 썸네일 프록시를 추가하면 별도 서버 fetch에도 같은 검사를 적용한다.

5. 조회 실패에는 입력 URL이나 기존 카드를 보존한다. 편집 중 클릭은 원치 않는 이동을 막고 명시적 링크 열기·수정·삭제·정렬·이동을 제공한다. 수정 실패·undo는 기존 주소와 카드를 복원한다.

## 검증

내부 IP, DNS 재바인딩, 내부로 리다이렉트, 자격정보 URL, 느린 응답, 큰 HTML, 손상 태그, 단독/문장 URL, 카드 수정 실패와 undo를 검증한다. SSRF 정책을 바꿀 때 네트워크 검증을 생략하지 않는다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
