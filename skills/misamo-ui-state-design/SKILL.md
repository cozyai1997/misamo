---
name: misamo-ui-state-design
description: "Refine icon alignment and state feedback in an existing website, including consistent hit targets, true active states, hover/focus disclosure, and touch accessibility."
---

# 아이콘 정렬과 활성 상태

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 기존 폰트·간격·색상 토큰을 먼저 읽고 현재 디자인 언어 안에서 맞춘다. 미사모의 분홍색·아이콘 크기·레이아웃을 다른 브랜드의 기본값으로 강요하지 않는다.

2. 아이콘의 보이는 크기와 클릭 영역을 분리한다. 동일 행의 아이콘은 viewBox·stroke·정렬 상자를 맞추고, 삭제/이전/다음 버튼은 원·사각형 내부 중심이 어긋나지 않게 한다.

3. 활성 색은 실제 상태에서 파생한다. like/bookmark는 aria-pressed, 댓글 펼침은 aria-expanded, 서식은 문서 선택 상태를 따른다. hover/focus가 선택됨처럼 보이지 않게 구분하되 키보드 초점 표시는 남긴다.

4. 숨김 편집 도구는 포인터 hover만으로 접근하게 하지 않는다. focus-within·활성 항목·터치에서 접근 가능하게 하고, 비율 선택창을 조작하는 동안 숨기지 않는다.

5. 텍스트를 빼는 아이콘에도 aria-label을 두고 전체 행의 간격·높이·라벨 정렬을 함께 검토한다. 작은 화면에서 내용이 잘리면 좁은 컨테이너와 최소 너비부터 확인한다.

## 검증

일반/hover/focus/active/disabled 각각의 색과 정렬, 키보드만 사용, 터치, 긴 라벨, 320~430px 화면, 확대 글꼴, 버튼 연속 클릭을 검증한다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
