"""위젯 디자인 재료 도우미.

  crop     : 페이지 캡처에서 아이콘 부분만 잘라 낸다 (원본 파일이 없을 때)
  palette  : 이미지들에서 많이 쓰인 색을 정확한 hex로 뽑는다 (투명·거의 흰색 제외)
  datauri  : 이미지를 작게 줄여 HTML에 바로 넣을 data URI로 만든다
  inject   : worker.js 의 자리표시자(예: __ICON__)를 data URI 파일 내용으로 바꾼다

필요: pip install pillow

사용 예:
  python assets.py crop page.png 120 40 180 100 assets/wallet.png
  python assets.py palette assets/*.png
  python assets.py datauri assets/icon_wallet.png --max 160      # -> assets/icon_wallet.datauri.txt
  python assets.py inject worker.js __ICON__ assets/icon_wallet.datauri.txt
"""
import argparse
import base64
import io
import sys
from collections import Counter
from pathlib import Path

from PIL import Image


def crop(image, x0, y0, x1, y1, out):
    Image.open(image).convert("RGBA").crop((x0, y0, x1, y1)).save(out)
    print(out)


def palette(paths, n=6):
    pixels = []
    for p in paths:
        img = Image.open(p).convert("RGBA")
        img.thumbnail((200, 200))
        raw = img.tobytes()
        for i in range(0, len(raw), 4):
            r, g, b, a = raw[i:i + 4]
            if a >= 200 and min(r, g, b) <= 240:  # 투명·거의 흰색 제외
                pixels.append((r, g, b))
    if not pixels:
        print("색을 뽑을 픽셀이 없어요")
        return
    strip = Image.new("RGB", (len(pixels), 1))
    strip.putdata(pixels)
    q = strip.quantize(colors=max(n * 2, 8), method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = Counter(q.tobytes())
    total = len(pixels)
    picked = []
    for idx, c in counts.most_common():
        r, g, b = pal[idx * 3:idx * 3 + 3]
        if any(abs(r - pr) + abs(g - pg) + abs(b - pb) < 40 for pr, pg, pb, _ in picked):
            continue
        picked.append((r, g, b, c))
        if len(picked) == n:
            break
    for r, g, b, c in picked:
        print(f"#{r:02X}{g:02X}{b:02X}  {c * 100 / total:.0f}%")


def datauri(path, max_px=160):
    img = Image.open(path).convert("RGBA")
    img.thumbnail((max_px, max_px), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=85)
    uri = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    out = Path(path).with_suffix(".datauri.txt")
    out.write_text(uri)
    print(f"{out}  ({len(uri) / 1024:.0f} KB)")


def inject(worker, placeholder, uri_file):
    w = Path(worker)
    text = w.read_text()
    n = text.count(placeholder)
    if n == 0:
        print(f"{placeholder} 자리표시자가 없어요")
        return
    w.write_text(text.replace(placeholder, Path(uri_file).read_text().strip()))
    print(f"{placeholder} {n}곳 교체 -> {w} ({w.stat().st_size / 1024:.0f} KB)")


def main(argv=None):
    ap = argparse.ArgumentParser(description="위젯 디자인 재료 도우미")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("crop"); a.add_argument("image"); [a.add_argument(k, type=int) for k in ("x0", "y0", "x1", "y1")]; a.add_argument("out")
    a = sub.add_parser("palette"); a.add_argument("images", nargs="+"); a.add_argument("-n", type=int, default=6)
    a = sub.add_parser("datauri"); a.add_argument("image"); a.add_argument("--max", type=int, default=160)
    a = sub.add_parser("inject"); a.add_argument("worker"); a.add_argument("placeholder"); a.add_argument("uri_file")
    args = ap.parse_args(argv)
    if args.cmd == "crop":
        crop(args.image, args.x0, args.y0, args.x1, args.y1, args.out)
    elif args.cmd == "palette":
        palette(args.images, args.n)
    elif args.cmd == "datauri":
        datauri(args.image, args.max)
    else:
        inject(args.worker, args.placeholder, args.uri_file)


if __name__ == "__main__":
    sys.exit(main())
