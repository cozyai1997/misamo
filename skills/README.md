# 미사모 재사용 제작 스킬

다른 웹사이트를 만들 때 필요한 기능만 골라 사용할 수 있는 Codex 스킬 15개입니다. 실행 가능한 사이트 템플릿이나 서버 서비스가 아니라, 구현 순서·실패 처리·검증 방법을 담은 작업 지침입니다. 본문은 한국어이며 검색용 설명은 영어를 함께 사용합니다.

## 스킬 목록

| 스킬 | 용도 |
| --- | --- |
| [misamo-rich-text-editor](misamo-rich-text-editor/SKILL.md) | 본문 편집기와 실행 취소 |
| [misamo-inline-media](misamo-inline-media/SKILL.md) | 본문 사이 사진·영상 편집 |
| [misamo-video-upload](misamo-video-upload/SKILL.md) | 모바일 영상 첨부와 검증 |
| [misamo-media-carousel](misamo-media-carousel/SKILL.md) | 사진·영상 모아보기 |
| [misamo-long-post-reading](misamo-long-post-reading/SKILL.md) | 긴 게시글 읽기 |
| [misamo-threaded-comments](misamo-threaded-comments/SKILL.md) | 댓글과 답글 |
| [misamo-bookmark-folders](misamo-bookmark-folders/SKILL.md) | 북마크와 저장 폴더 |
| [misamo-community-prototype](misamo-community-prototype/SKILL.md) | 커뮤니티 화면과 사용자 행동 |
| [misamo-mobile-navigation](misamo-mobile-navigation/SKILL.md) | 모바일 메뉴와 스와이프 |
| [misamo-link-preview](misamo-link-preview/SKILL.md) | 안전한 링크 카드 |
| [misamo-browser-storage](misamo-browser-storage/SKILL.md) | 초안·게시글·미디어 저장 |
| [misamo-ui-state-design](misamo-ui-state-design/SKILL.md) | 아이콘 정렬과 활성 상태 |
| [misamo-auto-hashtags](misamo-auto-hashtags/SKILL.md) | 본문 해시태그 자동 등록 |
| [misamo-release-verification](misamo-release-verification/SKILL.md) | GitHub 커밋과 운영 배포 검증 |
| [misamo-ios-webview-shell](misamo-ios-webview-shell/SKILL.md) | iPhone 웹뷰 테스트 앱 준비 |

## 다른 프로젝트에서 사용하기

1. 이 저장소를 다운로드하거나 clone합니다.
2. 필요한 `misamo-...` 폴더 전체를 Codex 사용자 스킬 폴더에 복사합니다. 기본 경로는 `~/.codex/skills/`이며 CODEX_HOME을 별도로 지정했다면 그 아래 `skills/`를 사용합니다. 동일 이름이 있으면 먼저 내용을 비교하고 백업하세요.
3. 새 Codex 작업에서 프로젝트를 열고 아래처럼 필요한 스킬을 호출합니다. 현재 세션 목록에 즉시 나타나지 않으면 새 작업에서 확인하세요.

```text
$misamo-rich-text-editor 게시글 작성기에 서식 상태 표시와 실행 취소를 구현해줘.
$misamo-video-upload MP4·MOV를 첨부하고 모바일에서도 저장·복원되게 해줘.
$misamo-mobile-navigation 모바일 하단 메뉴와 스와이프 충돌을 해결해줘.
```

각 폴더의 `SKILL.md`는 사용 조건과 구현 지침, `agents/openai.yaml`은 표시 이름과 호출 예시, `references/misamo.md`는 해당 기능의 코드·테스트 링크입니다. 폴더 간 필수 의존성은 없습니다. 스킬을 사용한다고 외부 전송·운영 배포가 자동으로 승인되지는 않습니다.

## 상황별 조합

- 글쓰기: rich-text-editor + inline-media + auto-hashtags
- 사진·영상 피드: video-upload + media-carousel + long-post-reading
- 커뮤니티: threaded-comments + bookmark-folders + community-prototype
- 모바일 화면: mobile-navigation + ui-state-design
- 로컬 시제품: browser-storage; 실제 회원 서비스는 기존 서버 인증·DB·업로드 구조에 맞춰 별도로 연결
- 공개 URL 카드: link-preview
- GitHub·운영 반영: release-verification
- iPhone 테스트 셸: ios-webview-shell (TestFlight 완료와는 별개)

## 적용 범위와 검증

기준 코드 커밋: `abceed54f8a443c8de08ebf07288efcca9270548`. 제품 기본값은 예시이며 다른 사이트에서 변경할 수 있습니다. 브랜드 이미지·원본 테스트 영상·환경 변수·계정 자격증명은 이 스킬 묶음에 포함하지 않습니다. 웹뷰 CI 구성은 참조 자료이며 여기서 새로 실행하거나 배포한 결과가 아닙니다.

`catalog.json`은 스킬 목록과 참조 파일의 기계 판독용 색인입니다. 구조 검증은 skill-creator의 `quick_validate.py <skill-folder>`로 실행할 수 있습니다. 구조 통과는 대상 프로젝트 기능 구현·실기기 동작 검증을 대신하지 않습니다.
