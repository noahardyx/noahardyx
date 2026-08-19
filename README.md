# 리듬 — AI 금융목표 플래너

프리랜서·플랫폼 노동자의 변동 소득을 반영해 금융 목표 달성 가능성과 실행 플랜을 제안하는 MVP 2 프로토타입입니다.

## 실행

별도의 빌드 과정이 없는 정적 웹사이트입니다. `index.html`을 열거나 로컬 정적 서버로 실행할 수 있습니다.

```bash
python3 -m http.server 8000
```

## 주요 흐름

1. 챗봇에 금융 목표 입력
2. 현재 준비 금액과 필수 지출 입력
3. MVP 1 샘플 소득 데이터 반영
4. 현금흐름 및 몬테카를로 시뮬레이션 기반 달성 확률 계산
5. 안전·기본·도전 플랜 비교 및 선택

## MVP 1 API 연동 지점

현재 `app.js`의 `DEFAULT_INCOME`이 임시 소득 데이터 역할을 합니다. 실제 연동 시 이 값을 API 응답으로 교체하면 됩니다. 예상 응답 예시는 `mvp1-sample-data.json`에 있습니다.

```js
const response = await fetch('https://api.example.com/income/forecast');
const mvp1Income = await response.json();
```

## GitHub Pages 배포

저장소의 `Settings → Pages`에서 `Deploy from a branch`, `main`, `/ (root)`를 선택하면 됩니다. 모든 경로가 상대 경로라 프로젝트 페이지에서도 동작합니다.

## 주의

현재 모델은 프로토타입용 브라우저 시뮬레이션입니다. 실제 서비스에서는 계산 엔진을 서버에 두고, 입력 검증·모델 버전 관리·감사 로그를 추가해야 합니다.
