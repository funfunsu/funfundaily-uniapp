#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
images.py — 小红书/公众号配图生成器（依赖 Pillow：pip install pillow）

两类图：
  A. 文字卡片（脚本直接生成）
     cover  封面：超大标题 + 副标题 + 角标
     list   清单/表格：标题 + 分组词条（适合「30字」「100高频字」）
     rule   规律/步骤：标题 + 编号要点
  B. 截图美化
     frame  把小程序截图套进手机边框，可选叠加小程序码 + 文案
            （直接发截图效果差，套边框更像「产品展示」）

批量：
  batch  读 JSON 规格，一次生成一篇笔记的多张图

示例：
  python3 images.py cover --title "笔顺易错30字" --sub "一年级·可截图自查" --corner "附正确写法" --theme blue
  python3 images.py frame --shot shots/stroke.png --caption "输字看笔顺动画" --qr assets/miniapp-qr.png
  python3 images.py batch --spec specs/T001.json

⚠️ 小红书提醒：图里**别放微信小程序码**（站外导流，易限流）。frame 的 --qr 适合
   「发家长群 / 公众号配图 / 视频号」。小红书用 frame 就别带 --qr，导流靠简介+评论。
"""

import argparse
import json
import os

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("需要 Pillow：pip install pillow")

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "out")
CONFIG = os.path.join(ROOT, "config.json")

W, H = 1080, 1440  # 小红书 3:4
MARGIN = 90

FONT_CANDIDATES = [
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/Songti.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]

THEMES = {
    "blue":   {"accent": "#1e88e5", "accent2": "#4f8cff", "bg": "#ffffff", "ink": "#1f2937", "sub": "#64748b", "soft": "#e8f1ff", "band_ink": "#ffffff"},
    "amber":  {"accent": "#f59e0b", "accent2": "#fbbf24", "bg": "#fffdf7", "ink": "#1f2937", "sub": "#92742b", "soft": "#fff4e5", "band_ink": "#ffffff"},
    "green":  {"accent": "#10b981", "accent2": "#34d399", "bg": "#f7fffb", "ink": "#1f2937", "sub": "#4b7a63", "soft": "#d1fae5", "band_ink": "#ffffff"},
    "purple": {"accent": "#8b5cf6", "accent2": "#a78bfa", "bg": "#fbfaff", "ink": "#1f2937", "sub": "#6d5b9e", "soft": "#ede9fe", "band_ink": "#ffffff"},
    "plain":  {"accent": "#334155", "accent2": "#64748b", "bg": "#ffffff", "ink": "#0f172a", "sub": "#64748b", "soft": "#f1f5f9", "band_ink": "#ffffff"},
}

_FONT_PATH = None


def brand():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f).get("brand", "fungrowth 爱家")
    except Exception:
        return "fungrowth 爱家"


def font_path():
    global _FONT_PATH
    if _FONT_PATH:
        return _FONT_PATH
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                ImageFont.truetype(p, 24)
                _FONT_PATH = p
                return p
            except Exception:
                continue
    raise SystemExit("找不到可用的中文字体，请在 FONT_CANDIDATES 里加一个 .ttc/.ttf 路径")


def fnt(size):
    return ImageFont.truetype(font_path(), int(size))


def tw(text, f):
    return f.getlength(text)


def theme(name):
    return THEMES.get(name, THEMES["blue"])


def wrap(text, f, max_w):
    """按字符换行（中文友好），保留显式换行。"""
    lines = []
    for para in str(text).split("\n"):
        cur = ""
        for ch in para:
            if tw(cur + ch, f) <= max_w:
                cur += ch
            else:
                if cur:
                    lines.append(cur)
                cur = ch
        lines.append(cur)
    return lines


def fit_title(text, max_w, max_lines, big, small=48, step=4):
    """从 big 往下找一个字号，使标题换行后不超过 max_lines 行。返回 (font, lines)。"""
    size = big
    while size >= small:
        f = fnt(size)
        lines = wrap(text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines, size
        size -= step
    f = fnt(small)
    return f, wrap(text, f, max_w), small


def new_canvas(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)


def draw_brand(d, t, y=None):
    f = fnt(34)
    txt = brand()
    yy = H - 70 if y is None else y
    d.text((MARGIN, yy), txt, font=f, fill=t["sub"])


def draw_corner_tag(d, text, t):
    if not text:
        return
    f = fnt(40)
    pad = 28
    w = tw(text, f) + pad * 2
    h = 76
    x1 = W - MARGIN - w
    y1 = MARGIN
    d.rounded_rectangle([x1, y1, x1 + w, y1 + h], radius=h // 2, fill=t["accent"])
    d.text((x1 + pad, y1 + h / 2 - f.size * 0.62), text, font=f, fill="#ffffff")


def save(img, out, name):
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, name)
    img.save(path, "PNG")
    print("✅", os.path.relpath(path, ROOT))
    return path


# ----------------------------- cover -----------------------------

def make_cover(spec, out, name, theme_name):
    t = theme(theme_name)
    img, d = new_canvas(t["bg"])
    # 顶部主题色粗线
    d.rectangle([0, 0, W, 16], fill=t["accent"])
    draw_corner_tag(d, spec.get("corner"), t)

    title = spec.get("title", "")
    sub = spec.get("sub", "")
    max_w = W - MARGIN * 2
    f, lines, size = fit_title(title, max_w, max_lines=4, big=150, small=64)
    line_h = size * 1.22
    block_h = len(lines) * line_h + (110 if sub else 0)
    y = (H - block_h) / 2 - 40
    for ln in lines:
        d.text(((W - tw(ln, f)) / 2, y), ln, font=f, fill=t["ink"])
        y += line_h
    if sub:
        sf = fnt(56)
        y += 30
        for ln in wrap(sub, sf, max_w):
            d.text(((W - tw(ln, sf)) / 2, y), ln, font=sf, fill=t["accent"])
            y += sf.size * 1.3
    # 底部品牌 + 引导
    draw_brand(d, t)
    cta = spec.get("cta", "微信搜「" + brand() + "」免费用")
    cf = fnt(34)
    d.text((W - MARGIN - tw(cta, cf), H - 70), cta, font=cf, fill=t["sub"])
    return save(img, out, name)


# ----------------------------- list -----------------------------

ITEM_LH = 1.42        # 词条行高系数
GROUP_GAP = 34        # 分组之间间距
LABEL_GAP_AFTER = 22  # 分组标签下方间距


def _list_height(isz, lsz, groups, items):
    """按渲染逻辑预估内容总高度，用于自动缩放字号防溢出。"""
    y = 0
    if groups:
        itf = fnt(isz)
        pill_h = lsz + 26
        for g in groups:
            if g.get("name"):
                y += pill_h + LABEL_GAP_AFTER
            for _ in wrap(g.get("items", ""), itf, W - MARGIN * 2):
                y += isz * ITEM_LH
            y += GROUP_GAP
    else:
        itf = fnt(isz)
        for it in (items or []):
            for _ in wrap("· " + it, itf, W - MARGIN * 2):
                y += isz * 1.5
            y += 14
    return y


def make_list(spec, out, name, theme_name):
    t = theme(theme_name)
    img, d = new_canvas(t["bg"])
    # 顶部标题带
    band_h = 240
    d.rectangle([0, 0, W, band_h], fill=t["accent"])
    title = spec.get("title", "")
    tf, tlines, tsize = fit_title(title, W - MARGIN * 2, max_lines=2, big=76, small=48)
    ty = max(24, (band_h - len(tlines) * tsize * 1.2) / 2)
    for ln in tlines:
        d.text(((W - tw(ln, tf)) / 2, ty), ln, font=tf, fill="#ffffff")
        ty += tsize * 1.2

    top = band_h + 50
    avail = (H - 110) - top
    groups = spec.get("groups")
    items = spec.get("items", [])

    # 自动选字号：从大到小，直到内容能装下
    isz = 58
    while isz > 30:
        lsz = int(isz * 0.82)
        if _list_height(isz, lsz, groups, items) <= avail:
            break
        isz -= 2
    lsz = int(isz * 0.82)

    y = top
    if groups:
        nf = fnt(lsz)
        itf = fnt(isz)
        pill_h = lsz + 26
        for g in groups:
            label = g.get("name", "")
            if label:
                lw = tw(label, nf) + 44
                d.rounded_rectangle([MARGIN, y, MARGIN + lw, y + pill_h], radius=pill_h // 2, fill=t["soft"])
                d.text((MARGIN + 22, y + pill_h / 2 - nf.size * 0.62), label, font=nf, fill=t["accent"])
                y += pill_h + LABEL_GAP_AFTER
            for ln in wrap(g.get("items", ""), itf, W - MARGIN * 2):
                d.text((MARGIN, y), ln, font=itf, fill=t["ink"])
                y += isz * ITEM_LH
            y += GROUP_GAP
    else:
        itf = fnt(isz)
        for it in items:
            for ln in wrap("· " + it, itf, W - MARGIN * 2):
                d.text((MARGIN, y), ln, font=itf, fill=t["ink"])
                y += isz * 1.5
            y += 14

    draw_brand(d, t)
    return save(img, out, name)


# ----------------------------- rule -----------------------------

def make_rule(spec, out, name, theme_name):
    t = theme(theme_name)
    img, d = new_canvas(t["bg"])
    d.rectangle([0, 0, W, 16], fill=t["accent"])
    title = spec.get("title", "")
    tf, tlines, tsize = fit_title(title, W - MARGIN * 2, max_lines=2, big=88, small=56)
    y = 110
    for ln in tlines:
        d.text((MARGIN, y), ln, font=tf, fill=t["ink"])
        y += tsize * 1.2
    y += 50
    pf = fnt(52)
    nf = fnt(46)
    for i, p in enumerate(spec.get("points", []), 1):
        cy = y + 38
        r = 38
        d.ellipse([MARGIN, cy - r, MARGIN + 2 * r, cy + r], fill=t["accent"])
        num = str(i)
        d.text((MARGIN + r - tw(num, nf) / 2, cy - nf.size * 0.62), num, font=nf, fill="#ffffff")
        tx = MARGIN + 2 * r + 30
        lines = wrap(p, pf, W - tx - MARGIN)
        for j, ln in enumerate(lines):
            d.text((tx, y + j * pf.size * 1.3), ln, font=pf, fill=t["ink"])
        y += max(2 * r + 40, len(lines) * pf.size * 1.3 + 30)

    draw_brand(d, t)
    return save(img, out, name)


# ----------------------------- frame（截图套手机边框） -----------------------------

def _rounded(im, radius):
    """给图片加圆角，返回 RGBA。"""
    im = im.convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0], im.size[1]], radius=radius, fill=255)
    im.putalpha(mask)
    return im


def _contain(im, box_w, box_h, bg="#ffffff"):
    """等比缩放后居中铺到 box 上（contain）。"""
    im = im.convert("RGB")
    r = min(box_w / im.width, box_h / im.height)
    nw, nh = max(1, int(im.width * r)), max(1, int(im.height * r))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (box_w, box_h), bg)
    canvas.paste(im, ((box_w - nw) // 2, (box_h - nh) // 2))
    return canvas


def make_frame(spec, out, name, theme_name):
    t = theme(theme_name)
    bg = t["soft"]
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    # 标题
    title = spec.get("title", "")
    if title:
        tf, tlines, tsize = fit_title(title, W - MARGIN * 2, max_lines=1, big=72, small=44)
        ty = 56
        for ln in tlines:
            d.text(((W - tw(ln, tf)) / 2, ty), ln, font=tf, fill=t["ink"])
            ty += tsize * 1.2

    # 手机边框
    body_w, body_h = 600, 1070
    bx = (W - body_w) // 2
    by = 165
    d.rounded_rectangle([bx, by, bx + body_w, by + body_h], radius=72, fill="#0f1115")
    # 屏幕
    pad = 20
    sx, sy = bx + pad, by + pad
    sw, sh = body_w - 2 * pad, body_h - 2 * pad
    shot_path = spec.get("shot")
    if shot_path and os.path.exists(_abs(shot_path)):
        screen = _contain(Image.open(_abs(shot_path)), sw, sh, bg="#ffffff")
    else:
        screen = Image.new("RGB", (sw, sh), "#e9eef5")
        sd = ImageDraw.Draw(screen)
        msg = "把截图放这里\n--shot 截图路径"
        mf = fnt(40)
        yy = sh // 2 - 50
        for ln in msg.split("\n"):
            sd.text(((sw - tw(ln, mf)) / 2, yy), ln, font=mf, fill="#94a3b8")
            yy += 60
    screen = _rounded(screen, 52)
    img.paste(screen, (sx, sy), screen)
    # 刘海
    nw_, nh_ = 200, 38
    d.rounded_rectangle([W // 2 - nw_ // 2, by + pad - 2, W // 2 + nw_ // 2, by + pad + nh_], radius=nh_ // 2, fill="#0f1115")

    # 底部：文案 + 可选小程序码
    band_y = by + body_h + 28
    caption = spec.get("caption", "")
    qr_path = spec.get("qr")
    has_qr = qr_path and os.path.exists(_abs(qr_path))

    if has_qr:
        qr = Image.open(_abs(qr_path)).convert("RGB")
        qsize = 150
        qr = qr.resize((qsize, qsize), Image.LANCZOS)
        card_h = qsize + 40
        card = [MARGIN, band_y, W - MARGIN, band_y + card_h]
        d.rounded_rectangle(card, radius=28, fill="#ffffff")
        img.paste(qr, (W - MARGIN - 20 - qsize, band_y + 20))
        cf = fnt(46)
        sf = fnt(34)
        d.text((MARGIN + 36, band_y + 36), caption or "长按识别小程序码", font=cf, fill=t["ink"])
        d.text((MARGIN + 36, band_y + 36 + 64), "免费 · " + brand(), font=sf, fill=t["sub"])
    else:
        if caption:
            cf = fnt(50)
            for i, ln in enumerate(wrap(caption, cf, W - MARGIN * 2)):
                d.text(((W - tw(ln, cf)) / 2, band_y + i * cf.size * 1.3), ln, font=cf, fill=t["ink"])
        # 引导 pill（不放码时给文字引导）
        cta = spec.get("cta", "微信搜「" + brand() + "」")
        pf = fnt(40)
        pw = tw(cta, pf) + 64
        px = (W - pw) / 2
        py = band_y + (90 if caption else 20)
        d.rounded_rectangle([px, py, px + pw, py + 78], radius=39, fill=t["accent"])
        d.text((px + 32, py + 39 - pf.size * 0.62), cta, font=pf, fill="#ffffff")

    return save(img, out, name)


def _abs(p):
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


# ----------------------------- batch -----------------------------

MAKERS = {"cover": make_cover, "list": make_list, "rule": make_rule, "frame": make_frame}


def make_one(slide, out, idx, default_theme):
    typ = slide.get("type", "cover")
    maker = MAKERS.get(typ)
    if not maker:
        print("⚠️ 未知类型:", typ)
        return
    th = slide.get("theme", default_theme)
    name = slide.get("out") or f"{idx:02d}-{typ}.png"
    maker(slide, out, name, th)


def cmd_batch(args):
    with open(_abs(args.spec), encoding="utf-8") as f:
        spec = json.load(f)
    default_theme = spec.get("theme", "blue")
    out = _abs(spec.get("out_dir", os.path.join("out", os.path.splitext(os.path.basename(args.spec))[0])))
    slides = spec.get("slides", [])
    print(f"生成 {len(slides)} 张 → {os.path.relpath(out, ROOT)}")
    for i, s in enumerate(slides, 1):
        make_one(s, out, i, default_theme)


# ----------------------------- single cmds -----------------------------

def cmd_single(args):
    out = _abs(args.out_dir) if args.out_dir else OUT_DIR
    spec = {k: v for k, v in vars(args).items() if v is not None}
    name = args.name or f"{args.cmd}.png"
    MAKERS[args.cmd](spec, out, name, args.theme or "blue")


def main():
    p = argparse.ArgumentParser(description="小红书/公众号配图生成器")
    sub = p.add_subparsers(dest="cmd")

    def common(sp):
        sp.add_argument("--theme", choices=list(THEMES.keys()), default="blue")
        sp.add_argument("--out-dir")
        sp.add_argument("--name")

    sp = sub.add_parser("cover", help="封面卡")
    sp.add_argument("--title", required=True)
    sp.add_argument("--sub")
    sp.add_argument("--corner")
    sp.add_argument("--cta")
    common(sp)
    sp.set_defaults(func=cmd_single)

    sp = sub.add_parser("list", help="清单卡（用 --item 多次，或 batch 里用 groups）")
    sp.add_argument("--title", required=True)
    sp.add_argument("--item", dest="items", action="append")
    common(sp)
    sp.set_defaults(func=cmd_single)

    sp = sub.add_parser("rule", help="规律/步骤卡（--point 多次）")
    sp.add_argument("--title", required=True)
    sp.add_argument("--point", dest="points", action="append")
    common(sp)
    sp.set_defaults(func=cmd_single)

    sp = sub.add_parser("frame", help="截图套手机边框")
    sp.add_argument("--shot", help="截图路径")
    sp.add_argument("--title")
    sp.add_argument("--caption")
    sp.add_argument("--qr", help="小程序码图片（小红书勿用，家长群/公众号/视频号可用）")
    sp.add_argument("--cta")
    common(sp)
    sp.set_defaults(func=cmd_single)

    sp = sub.add_parser("batch", help="按 JSON 规格批量生成一篇的多图")
    sp.add_argument("--spec", required=True)
    sp.set_defaults(func=cmd_batch)

    args = p.parse_args()
    if not getattr(args, "func", None):
        p.print_help()
        return
    args.func(args)


if __name__ == "__main__":
    main()
