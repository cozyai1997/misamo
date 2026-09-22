---
name: misamo-rich-text-editor
description: "Build or repair rich-text post composers with persistent selection, formatting state, sticky tools, and undo/redo. Use for editor behavior, not general page styling."
---

# 본문 편집기와 실행 취소

미사모에서 추출한 구현 지침이다. 다른 사이트에서도 사용할 수 있으며 대상의 기술 스택·데이터 계층·브랜드·사용자 요구를 우선한다.

## 구현 순서

1. 대상 프로젝트의 에디터와 문서 모델을 먼저 확인한다. 기존 에디터 라이브러리가 있으면 transaction/selection API를 사용하고, 미사모의 contenteditable·execCommand 구현을 새 프로젝트의 필수 기술로 삼지 않는다.

2. 도구 클릭·파일 선택 전에 본문 선택 범위를 보존한다. 복원 전 시작·끝 노드가 여전히 에디터 안에 있는지 확인하고 유효하지 않으면 명시한 기본 삽입 위치를 사용한다. 제목 입력란의 선택을 본문 선택으로 저장하지 않는다.

3. 굵게·기울임·밑줄 상태는 클릭 횟수가 아니라 현재 문서·커서 상태에서 읽는다. 혼합 선택은 비활성 또는 제품에서 정한 mixed 상태로 표시한다. 선택 이동, 입력, 키보드 서식, undo/redo, 초점 이동 후 갱신한다. aria-pressed와 화면 색을 일치시킨다.

4. 본문·미디어 메타데이터·대표 항목·순서·선택 위치를 같은 undo 단위로 다룬다. 한 번의 드래그/리사이즈는 한 단계, 한글 IME 조합은 완료 후 한 단계로 기록한다. undo 뒤 새 편집은 redo 분기를 비운다.

5. 고정 도구 모음은 실제 사이트 헤더 높이와 자체 높이에 맞춘다. 키보드·작은 화면에서 커서와 도구가 겹치지 않는지 확인한다. 아이콘 전용 도구에는 접근 가능한 이름을 남긴다.

## 검증

서식 적용/해제, 혼합 선택, 제목으로 초점 이동, 키보드 조작, 긴 본문 끝에서 삽입, IME, 이동·크기 변경 후 undo/redo, 새로고침 복원을 확인한다. DOM 모의 테스트만으로 실제 selection 동작을 검증했다고 하지 않는다.

## 구현 참고

실제 코드 구조나 회귀 테스트가 필요할 때 [미사모 참조](references/misamo.md)를 읽는다. 스킬 단독으로 사용할 때 참조 저장소 전체를 복제할 필요는 없다.
