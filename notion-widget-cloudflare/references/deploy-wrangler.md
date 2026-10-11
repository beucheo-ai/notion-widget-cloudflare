# Wrangler로 올리기 — 순서와 막힐 때

모든 명령은 작업 폴더 `W`(바탕화면/노션 위젯/<페이지 이름>)에서 실행한다.

## 처음 한 번
1. Node.js: `node -v` 로 확인. 없으면 맥 `brew install node`(Homebrew가 없으면 nodejs.org 에서 LTS 설치), 윈도우 `winget install OpenJS.NodeJS.LTS`. 설치 직후 `node` 가 안 잡히면 새 터미널을 열어야 한다.
2. 로그인: `npx -y wrangler whoami` → 로그인 안 돼 있으면 `npx -y wrangler login`.
   - 브라우저에 Cloudflare 허용 창이 뜬다 → 사용자가 **Allow**. 명령이 끝날 때까지 기다린다.
   - Cloudflare 계정이 없으면 dash.cloudflare.com/sign-up 가입 → 메일 인증 → 다시 로그인.
   - 다른 계정으로 로그인돼 있으면 `npx -y wrangler logout` 후 다시 `login`.
3. `wrangler.toml`(SKILL.md 3단계 3번). `keep_vars = true` 는 Cloudflare 화면에서 넣은 값이 다시 올릴 때 지워지지 않게 한다.

## 처음 쓰는 계정 (workers.dev 주소가 아직 없을 때)
`wrangler deploy` 가 workers.dev 하위 주소를 등록하라고 하면(묻거나 오류로 안내함):
- 대화형으로 물으면 사용자가 원하는 영어 이름을 받아 입력한다.
- 오류로 멈추면 사용자에게: Cloudflare 화면 → **Workers 및 Pages** 에 한 번 들어가 하위 주소(예: `내이름.workers.dev`)를 정하고 저장 → 다시 `npx -y wrangler deploy`.

## 올리기·고치기·되돌리기
- 올리기/다시 올리기: `npx -y wrangler deploy` → 출력의 `https://…workers.dev` 주소.
- 새 Worker 첫 배포에서 `[code: 10007] This Worker does not exist on your account` 가 나오면(업로드는 됐는데 주소 켜기 단계에서 실패) 몇 초 뒤 한 번 더 `npx -y wrangler deploy`. 주소가 `error code: 1042` 로 안 열릴 때도 같다.
- 비밀값은 다시 올려도 유지된다(따로 지우지 않는 한).
- 되돌리기: `npx -y wrangler rollback --message "되돌리기" --yes` (바로 전 버전으로). 또는 `worker.이전.js` 를 `worker.js` 로 돌려놓고 다시 올리기.
- 지우기(사용자가 원할 때만): `npx -y wrangler delete --name <name> --force`. 노션에 붙인 위젯이 전부 멈춘다는 걸 먼저 말하고 OK 받기.

## 위젯 비밀번호 (WIDGET_SECRET) — 내가 한다
- `W/.widget-secret` 에 영문+숫자 24자. 값을 화면·대화·위젯 파일에 쓰지 않는다.
- 넣기: `npx -y wrangler secret put WIDGET_SECRET < .widget-secret` (표준입력. 타이핑 창 없이 끝남)
- 확인: `npx -y wrangler secret list` → 이름만 본다.

## 노션 토큰 (NOTION_TOKEN) — 사용자가 직접 (체크리스트로 준다)
1. notion.so/profile/integrations → **Connections** → **+ New connection** → 이름(예: `노션 위젯`) → **API token** → Create → 토큰 복사(`ntn_` 로 시작)
2. Cloudflare → **Workers 및 Pages** → `<name>` → **설정** → **변수 및 비밀** → **추가**
3. 이름 `NOTION_TOKEN`, 값 붙여넣기, 유형 **비밀**(Secret) → **배포**(저장)
4. 위젯이 쓰는 DB마다 `···` → **연결** → **연결 추가하기** → 1에서 만든 연결
- 2~3 대신 사용자 **본인 터미널 앱**에서 넣어도 된다: 작업 폴더로 이동(`cd "<W 경로>"`) → `npx wrangler secret put NOTION_TOKEN` → 토큰 붙여넣기(화면에 안 보임) → Enter.
- 토큰은 채팅창에 붙여넣지 말라고 꼭 말한다. 클로드가 클립보드·파일 등으로 토큰을 대신 넣지 않는다. 다 됐다고 하면 `npx -y wrangler secret list` 로 이름만 확인.
