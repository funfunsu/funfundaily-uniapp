#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
content.py — fungrowth 爱家 内容营销工作流引擎（零依赖，Python3 标准库）

定位：做「确定性」的活——排期、记录、复盘、出给 Claude 写文案的 prompt。
创意（起选题 / 写文案）交给 Claude（见 README 的每周循环）。

子命令：
  plan      生成下周发布计划（按渠道节奏 + 主题配比选题），可 --write 落盘
  draft     为某个 topic 生成草稿文件骨架到 drafts/
  log       记录已发布内容的数据（浏览/收藏/涨粉…）
  analyze   复盘已发布数据，按「主题/渠道」排名，给下周策略调整建议
  add       往选题库 backlog 加一条选题
  backlog   查看选题库（按状态）
  prompt    输出可直接粘给 Claude 的 prompt（topics=扩选题 / write=写本周文案 / strategy=调策略）

用法示例：
  python3 content.py plan --write
  python3 content.py prompt write
  python3 content.py log
  python3 content.py analyze
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(ROOT, "config.json")
BACKLOG = os.path.join(ROOT, "data", "backlog.csv")
CALENDAR = os.path.join(ROOT, "data", "calendar.csv")
DRAFTS = os.path.join(ROOT, "drafts")

WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
WEEK_CN = {"Mon": "周一", "Tue": "周二", "Wed": "周三", "Thu": "周四",
           "Fri": "周五", "Sat": "周六", "Sun": "周日"}


# ----------------------------- 基础 IO -----------------------------

def load_config():
    with open(CONFIG, encoding="utf-8") as f:
        return json.load(f)


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


BACKLOG_FIELDS = ["id", "pillar", "platform_hint", "title", "angle", "keywords", "status", "created"]
CAL_FIELDS = ["date", "platform", "topic_id", "pillar", "title", "status",
              "url", "views", "saves", "likes", "comments", "follows", "mp_visits", "notes"]


def today():
    return datetime.now().date()


def upcoming_monday(ref=None):
    """本周一（若今天是周一就是今天），否则下一个周一之前的那个周一。
    规则：返回 >= 今天 的最近周一（今天是周一→今天）。"""
    d = ref or today()
    return d + timedelta(days=(7 - d.weekday()) % 7)


def pillar_map(cfg):
    return {p["key"]: p for p in cfg["pillars"]}


# ----------------------------- plan -----------------------------

def weighted_pillar_cycle(cfg):
    """按权重展开成一个循环序列，如 ganhuo,ganhuo,ganhuo,daka,daka,zhongcao。"""
    seq = []
    for p in cfg["pillars"]:
        seq += [p["key"]] * max(1, int(p.get("weight", 1)))
    return seq


def cmd_plan(args):
    cfg = load_config()
    pm = pillar_map(cfg)
    backlog = read_csv(BACKLOG)
    monday = datetime.strptime(args.week, "%Y-%m-%d").date() if args.week else upcoming_monday()

    # 可用选题池：status 为 idea / drafted
    available = [t for t in backlog if t.get("status") in ("idea", "drafted", "")]
    used_ids = set()
    cycle = weighted_pillar_cycle(cfg)
    ci = 0

    def pick(pillar, channel):
        """优先：该 pillar + 平台匹配且未用 → 该 pillar 未用 → 任意未用。"""
        cands = [t for t in available if t["pillar"] == pillar and t["id"] not in used_ids]
        pref = [t for t in cands if t.get("platform_hint") == channel]
        chosen = (pref or cands)
        if not chosen:
            chosen = [t for t in available if t["id"] not in used_ids]
        if not chosen:
            return None
        used_ids.add(chosen[0]["id"])
        return chosen[0]

    # 构建本周计划
    plan_rows = []
    for ch_key, ch in cfg["channels"].items():
        for day in ch.get("days", []):
            if day not in WEEK_ORDER:
                continue
            date = monday + timedelta(days=WEEK_ORDER.index(day))
            # 取下一个 pillar（轮转），但 pick 内部会兜底
            pillar = cycle[ci % len(cycle)]
            ci += 1
            topic = pick(pillar, ch_key)
            plan_rows.append({
                "date": date.isoformat(),
                "day": day,
                "platform": ch_key,
                "platform_name": ch["name"],
                "topic": topic,
                "pillar": (topic["pillar"] if topic else pillar),
            })

    plan_rows.sort(key=lambda r: (r["date"], r["platform"]))

    # 打印
    print(f"\n📅 发布计划  {monday.isoformat()} ~ {(monday + timedelta(days=6)).isoformat()}")
    print(f"   定位：{cfg['positioning']}")
    print("=" * 72)
    for r in plan_rows:
        t = r["topic"]
        pill = pm.get(r["pillar"], {}).get("name", r["pillar"])
        if t:
            print(f"{WEEK_CN[r['day']]} {r['date']}  [{r['platform_name']:<3}] ({pill}) {t['title']}")
            if t.get("keywords"):
                print(f"            关键词：{t['keywords']}   选题ID：{t['id']}")
        else:
            print(f"{WEEK_CN[r['day']]} {r['date']}  [{r['platform_name']:<3}] ({pill}) ⚠️ 选题库不足，运行 prompt topics 补题")
    print("=" * 72)
    n_topics = sum(1 for r in plan_rows if r["topic"])
    print(f"共 {len(plan_rows)} 个发布位，已排 {n_topics} 个选题。"
          f"{'  （选题不足，建议先补题）' if n_topics < len(plan_rows) else ''}")

    if args.write:
        # 落盘到 calendar（planned），并把选题标记为 scheduled
        cal = read_csv(CALENDAR)
        existing_keys = {(c["date"], c["platform"]) for c in cal}
        added = 0
        for r in plan_rows:
            if (r["date"], r["platform"]) in existing_keys:
                continue
            t = r["topic"]
            cal.append({
                "date": r["date"], "platform": r["platform"],
                "topic_id": t["id"] if t else "", "pillar": r["pillar"],
                "title": t["title"] if t else "", "status": "planned",
                "url": "", "views": "", "saves": "", "likes": "",
                "comments": "", "follows": "", "mp_visits": "", "notes": "",
            })
            added += 1
        write_csv(CALENDAR, cal, CAL_FIELDS)
        for t in backlog:
            if t["id"] in used_ids:
                t["status"] = "scheduled"
        write_csv(BACKLOG, backlog, BACKLOG_FIELDS)
        print(f"\n✅ 已写入 calendar.csv（新增 {added} 行 planned），选题标记为 scheduled。")
        print("   下一步：python3 content.py prompt write   → 把输出粘给 Claude 写本周文案")
    else:
        print("\n（这是预览。加 --write 落盘到 calendar.csv）")


# ----------------------------- draft -----------------------------

def cmd_draft(args):
    backlog = read_csv(BACKLOG)
    t = next((x for x in backlog if x["id"] == args.id), None)
    if not t:
        print(f"找不到选题 {args.id}")
        return
    os.makedirs(DRAFTS, exist_ok=True)
    safe = t["title"].replace("/", "／").replace(" ", "")[:30]
    path = os.path.join(DRAFTS, f"{t['id']}-{safe}.md")
    if os.path.exists(path) and not args.force:
        print(f"已存在：{path}（加 --force 覆盖）")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {t['title']}\n\n")
        f.write(f"- 选题ID：{t['id']}　主题：{t['pillar']}　建议平台：{t.get('platform_hint','')}\n")
        f.write(f"- 角度：{t.get('angle','')}\n")
        f.write(f"- 关键词：{t.get('keywords','')}\n\n")
        f.write("## 标题（3 个备选，含关键词）\n1. \n2. \n3. \n\n")
        f.write("## 正文\n\n\n")
        f.write("## 配图脚本（每张图画什么）\n1. 封面：\n2. \n3. \n\n")
        f.write("## 话题标签\n#幼小衔接 #识字 #笔顺 #育儿 \n\n")
        f.write("## 导流（不发链接/码，靠这些）\n- 简介引导词：\n- 评论区/私信关键词：\n")
    print(f"✅ 已生成草稿骨架：{path}")
    t["status"] = "drafted"
    write_csv(BACKLOG, backlog, BACKLOG_FIELDS)


# ----------------------------- log -----------------------------

def cmd_log(args):
    cfg = load_config()
    cal = read_csv(CALENDAR)
    if not cal:
        print("calendar.csv 为空，先 plan --write。")
        return
    if args.row is None:
        # 列出待补数据 / 全部
        print("\n# date       platform   status    title")
        for i, c in enumerate(cal):
            flag = "📝" if c["status"] != "published" else "✅"
            print(f"{i:>2} {flag} {c['date']}  {c['platform']:<10} {c['status']:<9} {c['title'][:30]}")
        print("\n记录数据：python3 content.py log --row N --published --views 1200 --saves 80 --follows 5 [--url ...] [--mp-visits 30]")
        return
    if args.row < 0 or args.row >= len(cal):
        print("row 越界")
        return
    c = cal[args.row]
    for m in cfg["metrics"]:
        v = getattr(args, m if m != "mp_visits" else "mp_visits")
        if v is not None:
            c[m] = v
    if args.url:
        c["url"] = args.url
    if args.notes:
        c["notes"] = args.notes
    if args.published:
        c["status"] = "published"
    write_csv(CALENDAR, cal, CAL_FIELDS)
    print(f"✅ 已更新第 {args.row} 行：{c['title']}")


# ----------------------------- analyze -----------------------------

def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def cmd_analyze(args):
    cfg = load_config()
    pm = pillar_map(cfg)
    cal = [c for c in read_csv(CALENDAR) if c["status"] == "published"]
    star = cfg.get("north_star", "saves")
    sname = cfg["metric_names"].get(star, star)
    if not cal:
        print("还没有 published 的数据。发布后用 log 记录，再来复盘。")
        return

    def avg(rows, key):
        vals = [_num(r.get(key)) for r in rows]
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else 0

    print(f"\n📊 复盘  共 {len(cal)} 条已发布内容   核心指标：{sname}({star})")
    print("=" * 72)

    # 按主题
    print("\n【按主题 pillar】")
    pillars = {}
    for c in cal:
        pillars.setdefault(c.get("pillar", "?"), []).append(c)
    ranked = sorted(pillars.items(), key=lambda kv: avg(kv[1], star), reverse=True)
    for k, rows in ranked:
        name = pm.get(k, {}).get("name", k)
        print(f"  {name:<6} 篇数{len(rows):>2}  均{sname} {avg(rows, star):>7.0f}  "
              f"均浏览 {avg(rows,'views'):>7.0f}  均涨粉 {avg(rows,'follows'):>5.1f}")

    # 按渠道
    print("\n【按渠道】")
    chans = {}
    for c in cal:
        chans.setdefault(c["platform"], []).append(c)
    for k, rows in sorted(chans.items(), key=lambda kv: avg(kv[1], star), reverse=True):
        name = cfg["channels"].get(k, {}).get("name", k)
        print(f"  {name:<5} 篇数{len(rows):>2}  均{sname} {avg(rows, star):>7.0f}  "
              f"均小程序访问 {avg(rows,'mp_visits'):>6.1f}")

    # 爆款
    top = sorted(cal, key=lambda r: (_num(r.get(star)) or 0), reverse=True)[:3]
    print(f"\n【Top 3（按{sname}）】值得做成系列：")
    for c in top:
        print(f"  {sname}{int(_num(c.get(star)) or 0):>5}  [{c['platform']}] {c['title']}")

    # 建议
    print("\n【下周策略建议】")
    if ranked:
        best, worst = ranked[0][0], ranked[-1][0]
        bname = pm.get(best, {}).get("name", best)
        if len(ranked) > 1 and avg(ranked[0][1], star) > 1.5 * max(avg(ranked[-1][1], star), 1):
            wname = pm.get(worst, {}).get("name", worst)
            print(f"  · 「{bname}」{sname}明显更高 → 下周加大「{bname}」占比，减少「{wname}」。"
                  f"（去 config.json 把 {best} 的 weight 调高）")
        else:
            print(f"  · 各主题{sname}接近 → 维持当前配比，先扩大「{bname}」的爆款选题做系列。")
    if top:
        print(f"  · 把 Top 选题「{top[0]['title']}」拆成系列（换字/换年级/换场景）连发 3-5 篇。")
    low_mp = [c for c in cal if (_num(c.get('mp_visits')) or 0) == 0 and (_num(c.get('views')) or 0) > 300]
    if low_mp:
        print(f"  · 有 {len(low_mp)} 篇浏览不错但小程序访问=0 → 导流话术/简介引导要加强（评论区置顶引导、简介写清搜索词）。")
    print("=" * 72)
    print("把以上复盘交给 Claude 调下周计划：python3 content.py prompt strategy")


# ----------------------------- add / backlog -----------------------------

def cmd_add(args):
    backlog = read_csv(BACKLOG)
    nums = [int(t["id"][1:]) for t in backlog if t["id"].startswith("T") and t["id"][1:].isdigit()]
    nid = f"T{(max(nums) + 1) if nums else 1:03d}"
    backlog.append({
        "id": nid, "pillar": args.pillar, "platform_hint": args.platform or "xiaohongshu",
        "title": args.title, "angle": args.angle or "", "keywords": args.keywords or "",
        "status": "idea", "created": today().isoformat(),
    })
    write_csv(BACKLOG, backlog, BACKLOG_FIELDS)
    print(f"✅ 已加入选题 {nid}：{args.title}")


def cmd_backlog(args):
    backlog = read_csv(BACKLOG)
    by = {}
    for t in backlog:
        by.setdefault(t.get("status", "idea") or "idea", []).append(t)
    for st in ["idea", "drafted", "scheduled", "published"]:
        rows = by.get(st, [])
        if not rows:
            continue
        print(f"\n[{st}] {len(rows)} 条")
        for t in rows:
            print(f"  {t['id']} ({t['pillar']:<8}) {t['title']}")


# ----------------------------- prompt -----------------------------

def _ctx(cfg):
    pills = "\n".join(f"  - {p['name']}({p['key']}, 权重{p['weight']})：{p['desc']}" for p in cfg["pillars"])
    chans = "\n".join(f"  - {c['name']}：{c['role']}，形式{c['format']}" for c in cfg["channels"].values())
    return (f"产品：{cfg['brand']}\n"
            f"切入人群：{cfg['wedge']}\n"
            f"定位一句话：{cfg['positioning']}\n"
            f"落地路径：{cfg['landing']}\n"
            f"内容主题（pillar）：\n{pills}\n"
            f"渠道分工：\n{chans}\n"
            f"核心指标：{cfg['metric_names'].get(cfg['north_star'], cfg['north_star'])}（{cfg['note']}）")


def cmd_prompt(args):
    cfg = load_config()
    backlog = read_csv(BACKLOG)
    ctx = _ctx(cfg)

    if args.kind == "topics":
        existing = "；".join(t["title"] for t in backlog)
        print(f"""你是资深小红书/公众号内容操盘手，服务一个母婴/幼小衔接产品。

{ctx}

【已有选题（不要重复）】
{existing}

【任务】再产出 {args.n} 条**新选题**，覆盖三类主题（干货清单为主）。每条给：
- pillar（ganhuo/daka/zhongcao 之一）
- 建议平台（xiaohongshu/wechat_mp/shipinhao）
- 标题（小红书风格、带关键词、能勾起点击/收藏）
- 角度（一句话说清这篇怎么写、为什么有人看）
- keywords（2-4 个搜索词，分号分隔）

输出成可直接执行的命令，每条一行：
python3 content.py add --pillar <p> --platform <plat> --title "<标题>" --angle "<角度>" --keywords "<kw1;kw2>"
""")

    elif args.kind == "write":
        cal = [c for c in read_csv(CALENDAR) if c["status"] == "planned"]
        if not cal:
            print("没有 planned 的内容。先：python3 content.py plan --write")
            return
        idx = {t["id"]: t for t in backlog}
        lines = []
        for c in cal:
            t = idx.get(c["topic_id"], {})
            lines.append(f"- [{c['date']} {cfg['channels'].get(c['platform'],{}).get('name',c['platform'])}] "
                         f"《{c['title']}》 主题{c['pillar']} 角度:{t.get('angle','')} 关键词:{t.get('keywords','')}")
        plan_txt = "\n".join(lines)
        print(f"""你是资深小红书/公众号内容操盘手。为下面这周已排期的内容**逐篇写成品文案**。

{ctx}

【本周排期】
{plan_txt}

【每篇产出】
1. 3 个备选标题（含关键词、≤20字、有点击欲）
2. 正文（小红书：口语、短句、emoji、分点；公众号：稍正式、利于搜一搜，标题含关键词）
3. 配图脚本：列出每张图画什么（第1张是封面，要有大字关键词）
4. 5-8 个话题标签
5. 导流话术：因为不能直接发链接/小程序码，给「简介引导词 + 评论区/私信关键词回复」两句
6. 真实、不浮夸、不承诺疗效；干货要可被收藏（清单/表格/口诀优先）

写完每篇后，提示我用 `python3 content.py draft <topicID>` 存草稿。""")

    elif args.kind == "strategy":
        print(f"""你是内容增长策略师。基于下面的复盘数据，给出**下周的调整方案**。

{ctx}

【上周复盘】请先在终端运行 `python3 content.py analyze`，把输出粘到这里：
<在此粘贴 analyze 的输出>

【任务】
1. 判断哪个主题/渠道 ROI 最高，下周该加大/减少谁（如需改 config.json 的 weight，给出具体数值）
2. 上周爆款该怎么做成系列（给 3-5 个具体新选题，用 add 命令格式输出）
3. 导流薄弱处（浏览高但小程序访问低）的具体改法
4. 一句话总结下周重点""")


# ----------------------------- main -----------------------------

def main():
    p = argparse.ArgumentParser(description="fungrowth 爱家 内容营销工作流引擎")
    sub = p.add_subparsers(dest="cmd")

    sp = sub.add_parser("plan", help="生成下周发布计划")
    sp.add_argument("--week", help="指定周一日期 YYYY-MM-DD（默认最近的周一）")
    sp.add_argument("--write", action="store_true", help="落盘到 calendar.csv")
    sp.set_defaults(func=cmd_plan)

    sp = sub.add_parser("draft", help="生成草稿骨架")
    sp.add_argument("id", help="选题ID，如 T001")
    sp.add_argument("--force", action="store_true")
    sp.set_defaults(func=cmd_draft)

    sp = sub.add_parser("log", help="记录已发布数据")
    sp.add_argument("--row", type=int, help="calendar 行号（不传则列出）")
    sp.add_argument("--published", action="store_true")
    sp.add_argument("--url")
    sp.add_argument("--notes")
    for m in ["views", "saves", "likes", "comments", "follows"]:
        sp.add_argument(f"--{m}")
    sp.add_argument("--mp-visits", dest="mp_visits")
    sp.set_defaults(func=cmd_log)

    sp = sub.add_parser("analyze", help="复盘 + 下周建议")
    sp.set_defaults(func=cmd_analyze)

    sp = sub.add_parser("add", help="加一条选题")
    sp.add_argument("--pillar", required=True, choices=["ganhuo", "daka", "zhongcao"])
    sp.add_argument("--title", required=True)
    sp.add_argument("--platform")
    sp.add_argument("--angle")
    sp.add_argument("--keywords")
    sp.set_defaults(func=cmd_add)

    sp = sub.add_parser("backlog", help="查看选题库")
    sp.set_defaults(func=cmd_backlog)

    sp = sub.add_parser("prompt", help="输出给 Claude 的 prompt")
    sp.add_argument("kind", choices=["topics", "write", "strategy"])
    sp.add_argument("--n", type=int, default=15, help="topics: 生成多少条")
    sp.set_defaults(func=cmd_prompt)

    args = p.parse_args()
    if not getattr(args, "func", None):
        p.print_help()
        return
    args.func(args)


if __name__ == "__main__":
    main()
