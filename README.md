# 노션 위젯 + Cloudflare 바로 올리기 (notion-widget-cloudflare)

노션 페이지 링크만 주면, 그 페이지의 칸·DB·아이콘·색을 읽고 **어울리는 위젯을 만들어 Cloudflare에 바로 올려줘요.** 깃허브도, 코드 붙여넣기도 필요 없어요.

- 처음 한 번 Cloudflare에 로그인(브라우저에서 **허용**만)하면, 그다음부터는 클로드가 올리고 고치고 되돌려요
- 한 페이지의 위젯은 주소 하나에 모여요 (`…workers.dev/clock`, `…workers.dev/dday`)
- 노션 데이터를 쓰는 위젯(메모 리스트·예산 등)은 위젯 비밀번호를 클로드가 알아서 정해 넣어요. 노션 토큰만 직접 넣으면 돼요
- 끝나면 "노션에 제가 바로 붙일까요, 직접 붙이실래요?"라고 물어봐요. 바로 붙이면 원하는 자리를 골라 넣어줘요

## 필요한 것
- **클로드 코드** (클로드 데스크톱 앱 Code 탭, VS Code, 터미널 중 아무거나) + **노션 연결**(Notion MCP) — 맥·윈도우 모두 돼요
- **Cloudflare 무료 계정** (dash.cloudflare.com/sign-up)
- Node.js (없으면 설치를 안내해요)
- 노션 데이터를 쓰는 위젯이면: 노션 API 토큰 (만드는 법을 안내해 줘요)

## 설치
클로드 코드에 이렇게 입력하세요.
```
이 저장소의 notion-widget-cloudflare 폴더를 내 스킬 폴더(~/.claude/skills/)에 설치해줘: https://github.com/beucheo-ai/notion-widget-cloudflare
```
설치 후 클로드 코드를 새로 열어야 스킬을 알아봐요.

## 사용
```
Cloudflare에 위젯을 올릴 수 있게 wrangler로 로그인해줘
```
```
이 노션 페이지에 어울리는 위젯을 노션 데이터 없이 되는 걸로 추천해줘. 고르면 만들어서 Cloudflare에 바로 올려줘: <노션 페이지 링크>
```
```
이 페이지에 메모 리스트 위젯 만들어줘. 노션 DB를 읽고 쓰게 하고 Cloudflare에 올려줘: <노션 페이지 링크>
```
```
내가 첨부한 이미지를 참고해서 하루 명언 위젯 만들어줘. 배경 그림은 코덱스로 만들어줘(글자 없이). Cloudflare에 올려줘: <노션 페이지 링크>
```
그림 생성은 클로드 코드에 Codex(ChatGPT 로그인)가 연결돼 있어야 해요. 안 돼 있으면 먼저 연결을 안내해요.

고칠 때는 "D-day 위젯 글자 더 크게 고쳐서 다시 올려줘", 되돌릴 때는 "이전 버전으로 되돌려줘".
Cloudflare에 올리지 않고 파일만 받고 싶으면 "Cloudflare에는 올리지 말고 worker.js 파일만 줘"라고 하세요(직접 붙여넣는 순서를 알려줘요).

위젯이 안 되면 위젯 주소 끝에 `&check=1` 을 붙여 열어 보세요. 어디가 막혔는지 알려줘요.

## 폴더 구성
```
notion-widget-cloudflare/
├─ SKILL.md                      진행 순서와 확인 지점
├─ templates/worker-skeleton.js  위젯 뼈대 (한 페이지 위젯들 + 노션 중간 서버 + 미리보기·점검 화면)
├─ scripts/assets.py             페이지 그림에서 색 뽑기 · 그림을 작게 줄여 파일에 넣기
└─ references/                   Wrangler 올리기, 노션에 붙이기, 붙여넣기 배포, Codex 그림, 안 될 때
```
