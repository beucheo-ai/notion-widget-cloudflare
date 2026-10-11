# 안 될 때

먼저 **점검 화면**: 위젯 주소 끝에 `&check=1` 을 붙여 연다(Worker 주소 `/?k=…&check=1` 은 모든 위젯). 어느 단계에서 막혔는지 ✅/❌ 로 알려준다(토큰·비밀번호 값은 안 나옴). 그 결과로 아래 표를 찾는다.

| 위젯에 뜨는 말 / 증상 | 원인 | 해결 |
|---|---|---|
| 서버 설정이 아직 안 됐어요 (비밀값) | 비밀값 2개 중 빠진 게 있음 | `npx -y wrangler secret list` 로 이름 확인. `WIDGET_SECRET` 이 없으면 4단계 1번 다시, `NOTION_TOKEN` 이 없으면 사용자에게 Cloudflare 화면에서 넣게 하기 |
| 키가 맞지 않아요 | 노션에 붙인 주소의 `k=` 값과 `W/.widget-secret` 이 다름(비밀번호를 새로 만들었거나 주소 일부가 잘림) | `.widget-secret` 값으로 주소를 다시 만들어 임베드 교체. 비밀번호를 바꿨다면 Cloudflare에도 다시 넣기 |
| 노션 연결 실패: … shared with your integration | 그 위젯의 DB에 연결을 안 했거나 다른 연결의 토큰 | 점검 화면에서 ❌ 난 위젯의 DB `···` → 연결 추가, 토큰 확인 |
| 노션 연결 실패: … property … | worker.js 의 그 위젯 `fields` 이름이 DB 속성 이름과 다름 | DB를 다시 fetch 해서 속성 이름 그대로 고치고 다시 올리기 |
| 목록은 보이는데 추가·체크가 안 됨 | 계산식·롤업 속성에 쓰려고 함 | 쓰기는 제목·텍스트·숫자·체크박스·선택·날짜만 가능 |
| ○○ 위젯이 없어요 / 없는 위젯이에요 | 주소 뒤 이름 오타, 또는 그 위젯을 아직 안 올림 | Worker 주소 `/` 의 목록과 비교, `npx -y wrangler deploy` 다시 |
| 하나 고쳤더니 다른 위젯도 멈춤 | 한 파일이라 문법 실수가 전체에 영향 | `npx -y wrangler rollback --message "되돌리기" --yes` 로 바로 되돌리고 다시 고치기 |
| (노션) 이 임베드를 불러오지 못했습니다 | 주소 오타, localhost 주소 | `W/README.txt` 의 https 주소 그대로 |
| 화면이 하얗게만 나옴 | 문법 오류 또는 올리기 실패 | `node --check` 로 문법 확인 후 다시 올리기. `wrangler deploy` 출력의 오류를 읽기 |
| 배포가 안 됨 (크기 초과) | 그림을 너무 많이·크게 넣음 | 위젯당 그림 2개 안팎, `datauri --max 120` 으로 더 작게. 위젯이 많으면 그림 없는 위젯을 섞기 |
| 위젯 오른쪽이 잘림 | 노션 칸이 좁음 | 칸 넓히기, 또는 "좁은 칸에서 줄어들게" 수정 요청 |
| 글꼴이 기본 글꼴로 보임 | Google Fonts 링크가 빠짐/오타 | `<link href="https://fonts.googleapis.com/...">` 확인 |
| `wrangler` 명령이 없다 / `npx` 를 못 찾음 | Node.js 미설치 | `deploy-wrangler.md` 처음 한 번 1번. 설치가 계속 안 되면 SKILL.md 3단계-직접(붙여넣기)으로 바꾸자고 제안 |
| 로그인 창이 안 뜸 / Not logged in | 로그인 안 됨, 다른 계정 | `npx -y wrangler login` (다른 계정이면 `logout` 먼저) |
| workers.dev subdomain 을 등록하라는 오류 | 처음 쓰는 Cloudflare 계정 | `deploy-wrangler.md` "처음 쓰는 계정" |
| 첫 배포에 `code: 10007` (This Worker does not exist), 주소는 `error code: 1042` | 새 Worker가 Cloudflare에 늦게 반영됨 | 몇 초 뒤 `npx -y wrangler deploy` 한 번 더 |
| Authentication error / 권한 오류 | 로그인 만료 | `npx -y wrangler login` 다시 |

## 클로드가 Cloudflare 안을 직접 볼 수 있는 것
- `npx -y wrangler whoami`(로그인), `npx -y wrangler secret list`(비밀값 이름), `npx -y wrangler deployments list`(올린 기록), `npx -y wrangler tail`(실시간 로그, 위젯을 열어 둔 채로)
- 값(토큰·비밀번호)은 볼 수 없고 보려 하지 않는다.
