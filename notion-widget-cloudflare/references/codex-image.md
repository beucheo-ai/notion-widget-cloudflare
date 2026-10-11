# Codex로 위젯 그림 만들기 (사용자가 요청했을 때만)

클로드는 SVG 말고 그림 같은 이미지는 직접 못 그린다. 사용자가 "코덱스로 그림 만들어줘"라고 하면 Codex CLI(ChatGPT 로그인)로 만든다. API 키는 쓰지 않는다.

## 0. 연결 확인
- `codex --version`, `codex login status`(→ `Logged in using ChatGPT`), `codex features list` 에서 `image_generation ... true`.
- 하나라도 안 되면 만들지 말고: "그림을 만들려면 Codex 연결이 먼저 필요해요. 가이드의 **위젯 만들기 → 준비 → Codex 연결하기**를 먼저 해주세요"라고 안내한다(사용자가 원하면 그 자리에서 연결을 도와도 된다: 설치 → `codex login` 은 사용자가 브라우저에서 직접).

## 1. 무엇을 그릴지 확인 ① 에 넣기
- 위젯 계획 표에 "그림" 칸을 더해 장면을 한 줄로 적는다(예: "들판·캠핑카·산이 보이는 아침 풍경, 글자 없음").
- 레퍼런스 그림이나 "○○풍"(예: 포켓캠프풍, 지브리풍) 요청이 있으면 그 그림체·색·분위기를 따른다.
- **레퍼런스 그림을 받았으면 먼저 그림체를 분석**해 확인 ① 에 한 줄로 보여준다: 선(굵기·유무), 질감(펠트·수채화·3D·픽셀 등), 색감(hex 2~3개), 명암(평면/부드러운 그림자), 캐릭터 비율(2~3등신 등). 레퍼런스 파일은 `W/assets/ref/` 에 둔다.
- 다만 특정 캐릭터를 그대로 그리거나 로고·상표를 넣지는 않는다(이미지 도구가 거절해 한도만 쓰기 쉽고, 공개 페이지에 올라가는 그림이라서). 비슷한 분위기의 새 캐릭터로 만든다.
- 무료 요금제는 몇 장이면 한도가 끝난다. 한 위젯당 1장을 기본으로 하고, 다시 뽑기는 사용자가 원할 때만.

## 2. 만들기
```
codex exec --skip-git-repo-check --sandbox workspace-write -C "W/assets/원본" -i "W/assets/ref/<레퍼런스>.png" "Generate ONE image with your image generation tool and save it as bg_raw.png in the current directory. Do not write any code.

Match the art style of the attached reference image: <분석한 그림체 한 줄(영어)>. Use the reference for style only, not its exact content.
Image: <장면 설명>. No text, no letters. Wide landscape composition, main subject on the right third so text can sit on the left."
```
- 레퍼런스가 없으면 `-i` 와 "Match the art style…" 줄을 빼고 페이지 색·그림체 설명만 넣는다. `-i` 는 여러 장 가능(`-i a.png -i b.png`).
- 2~6분 걸린다. 끝나면 `Generated one image … saved as …`.
- `model is not supported when using Codex with a ChatGPT account` → `-m` 로 지원 모델을 지정해 다시.
- `You've hit your usage limit` → 멈추고 사용자에게 알린다(안내된 날짜까지 기다리거나 SVG로 대신할지 묻기).
- 투명 배경은 잘 안 나온다. 캐릭터처럼 오려 쓸 그림은 흰 배경으로 받아 가장자리 흰색을 지운다.

## 3. 위젯에 넣기
1. 위젯 비율로 자르기: `assets.py crop W/assets/원본/bg_raw.png x0 y0 x1 y1 W/assets/bg.png` (가로형 위젯은 약 2.2:1).
2. 줄여서 넣기: `assets.py datauri W/assets/bg.png --max 1000` → `assets.py inject worker.js __BG__ W/assets/bg.datauri.txt`.
   - 1000px 이면 약 100KB. **worker.js 전체 1MB 이하**를 지킨다(넘으면 `--max 800`).
3. 그림 위 글자가 잘 읽히게 반투명 띠나 그림자 없는 흰 글상자를 둔다.
4. 확인 ② 미리보기에서 그림이 잘 보이는지 같이 본다.
