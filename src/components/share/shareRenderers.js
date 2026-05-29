// 分享海报「绘制器」注册表：每个 renderer = { buildLayout(env) → layout, paint(ctx, api, layout, qrImg, env) }。
// env = { payload, creatorName }。share-poster 组件按 renderer 字符串选择对应绘制器。
// 注意：mp-weixin 无法把函数作为组件 prop 传递，故用「导入的模块 + 字符串 key」而非函数 prop。

import { APP_BRAND } from '../../utils/appBrand'
import DateUtils from '../../utils/util'
import { drawRoundRectPath, truncate } from './shareCanvas'

// ============================================================
// 任务清单（列表）
// ============================================================
const TASK_WIDTH = 600
const TASK_PAD = 40
const TASK_HEADER_H = 200
const TASK_ROW_H = 96
const TASK_FOOTER_H = 360

const taskList = {
  title: '分享任务清单',
  hint: '好友收到图片后，长按识别二维码即可收下任务',
  buildLayout({ payload }) {
    const tasks = payload || []
    return {
      width: TASK_WIDTH,
      height: TASK_HEADER_H + tasks.length * TASK_ROW_H + TASK_FOOTER_H
    }
  },
  paint(ctx, api, layout, qrImg, { payload, creatorName }) {
    const tasks = payload || []
    const width = layout.width
    const height = layout.height

    api.setFill('#f5f7fa')
    ctx.fillRect(0, 0, width, height)

    // 顶部头图
    if (ctx.createLinearGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, TASK_HEADER_H)
      grad.addColorStop(0, '#4f8cff')
      grad.addColorStop(1, '#2196f3')
      api.setFill(grad)
    } else {
      api.setFill('#2196f3')
    }
    ctx.fillRect(0, 0, width, TASK_HEADER_H)

    api.setFill('rgba(255,255,255,0.92)')
    api.setTextAlign('left')
    api.setTextBaseline('top')
    api.setFont('600 22px sans-serif', 22)
    ctx.fillText(`${APP_BRAND} · 任务清单`, TASK_PAD, 46)

    api.setFill('#ffffff')
    api.setFont('800 32px "PingFang SC", sans-serif', 32)
    ctx.fillText(truncate(api, `来自 ${creatorName} 的分享`, width - TASK_PAD * 2), TASK_PAD, 88)

    api.setFill('rgba(255,255,255,0.85)')
    api.setFont('400 22px sans-serif', 22)
    ctx.fillText(`共 ${tasks.length} 个任务，一起打卡吧`, TASK_PAD, 140)

    // 任务行
    let y = TASK_HEADER_H + 16
    api.setTextBaseline('middle')
    tasks.forEach((task, idx) => {
      const cardX = TASK_PAD
      const cardY = y
      const cardW = width - TASK_PAD * 2
      const cardH = TASK_ROW_H - 16
      drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 16)
      api.setFill('#ffffff')
      ctx.fill()

      const dotR = 18
      const dotCx = cardX + 20 + dotR
      const dotCy = cardY + cardH / 2
      api.setFill('#e8f1ff')
      ctx.beginPath()
      ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2)
      ctx.fill()
      api.setFill('#2196f3')
      api.setTextAlign('center')
      api.setFont('700 20px sans-serif', 20)
      ctx.fillText(String(idx + 1), dotCx, dotCy + 1)

      const textX = dotCx + dotR + 18
      const score = Number(task?.extra?.score || 0)
      const tagText = score > 0 ? `+${score}分` : (task?.extra?.taskType === 'Habit' ? '习惯' : '任务')
      api.setFont('600 20px sans-serif', 20)
      const tagW = api.measureWidth(tagText) + 28
      const tagH = 40
      const tagX = cardX + cardW - tagW - 16
      const tagY = cardY + (cardH - tagH) / 2
      drawRoundRectPath(ctx, tagX, tagY, tagW, tagH, tagH / 2)
      api.setFill(score > 0 ? '#fff4e5' : '#eef2f7')
      ctx.fill()
      api.setFill(score > 0 ? '#f59e0b' : '#64748b')
      api.setTextAlign('center')
      ctx.fillText(tagText, tagX + tagW / 2, dotCy + 1)

      const textMaxW = tagX - textX - 16
      api.setTextAlign('left')
      api.setFill('#1f2937')
      api.setFont('600 24px sans-serif', 24)
      const desc = task?.itemDesc ? String(task.itemDesc) : ''
      if (desc) {
        ctx.fillText(truncate(api, task?.itemTitle || '未命名任务', textMaxW), textX, dotCy - 13)
        api.setFill('#94a3b8')
        api.setFont('400 18px sans-serif', 18)
        ctx.fillText(truncate(api, desc, textMaxW), textX, dotCy + 15)
      } else {
        ctx.fillText(truncate(api, task?.itemTitle || '未命名任务', textMaxW), textX, dotCy + 1)
      }

      y += TASK_ROW_H
    })

    // 底部二维码卡片
    const footerY = TASK_HEADER_H + tasks.length * TASK_ROW_H + 8
    const fCardX = TASK_PAD
    const fCardW = width - TASK_PAD * 2
    const fCardH = TASK_FOOTER_H - 40
    drawRoundRectPath(ctx, fCardX, footerY, fCardW, fCardH, 20)
    api.setFill('#ffffff')
    ctx.fill()

    const qrSize = 180
    const qrX = fCardX + (fCardW - qrSize) / 2
    const qrY = footerY + 30
    if (qrImg) {
      try { ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize) } catch (e) { /* ignore */ }
    } else {
      api.setFill('#f1f5f9')
      ctx.fillRect(qrX, qrY, qrSize, qrSize)
    }

    api.setFill('#1f2937')
    api.setTextAlign('center')
    api.setTextBaseline('top')
    api.setFont('600 22px sans-serif', 22)
    ctx.fillText('长按识别二维码 · 收下任务', width / 2, qrY + qrSize + 24)
    api.setFill('#94a3b8')
    api.setFont('400 18px sans-serif', 18)
    ctx.fillText(`用微信打开 ${APP_BRAND} 小程序`, width / 2, qrY + qrSize + 58)
  }
}

// ============================================================
// 课程表（周一~周日整周网格）
// ============================================================
const TIME_COL_W = 70
const HOUR_H = 84
const HEADER_BAND_H = 160
const DAY_HEADER_H = 72
const FOOTER_H = 300
const MIN_BLOCK_H = 46
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const PALETTE = ['#2196F3', '#00B8D4', '#3D5AFE', '#1565C0', '#5C6BC0', '#26A69A', '#7E57C2', '#0D47A1']

function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (isNaN(h)) return null
  return h * 60 + (isNaN(m) ? 0 : m)
}

const scheduleTimetable = {
  title: '分享课程表',
  hint: '好友长按识别二维码，或点开小程序链接即可收下课程表',
  buildLayout({ payload }) {
    const list = payload || []
    // 以最早一条日程所在的「周一」为基准，固定生成周一~周日 7 列（与日程页一致）。
    const dateStrs = list
      .map(s => s?.date || DateUtils.getDateFromDateTimeStr(s?.startTime || '', ''))
      .filter(Boolean)
      .sort()
    let base = new Date()
    const firstParts = String(dateStrs[0] || '').split('-').map(Number)
    if (firstParts.length === 3 && !firstParts.some(isNaN)) {
      base = new Date(firstParts[0], firstParts[1] - 1, firstParts[2])
    }
    const monday = DateUtils.getMonday(base)
    const columns = []
    for (let i = 0; i < 7; i++) {
      const d = DateUtils.getDayOff(monday, i)
      columns.push({
        date: DateUtils.getDateStr(d),
        week: WEEK_LABELS[d.getDay()],
        label: `${d.getMonth() + 1}/${d.getDate()}`
      })
    }

    let minStart = Infinity, maxEnd = -Infinity
    list.forEach(s => {
      const sm = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', ''))
      const em = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', ''))
      if (sm != null) { minStart = Math.min(minStart, sm); maxEnd = Math.max(maxEnd, sm + 60) }
      if (em != null) maxEnd = Math.max(maxEnd, em)
    })
    let startHour, endHour
    if (minStart === Infinity) { startHour = 8; endHour = 18 }
    else {
      startHour = Math.max(0, Math.floor(minStart / 60))
      endHour = Math.min(24, Math.ceil(maxEnd / 60))
      if (endHour <= startHour) endHour = Math.min(24, startHour + 1)
      if (endHour - startHour < 4) endHour = Math.min(24, startHour + 4)
    }

    const cols = Math.max(1, columns.length)
    const dayColW = Math.max(96, Math.min(220, Math.round(640 / cols)))
    const width = TIME_COL_W + cols * dayColW
    const gridH = (endHour - startHour) * HOUR_H
    const height = HEADER_BAND_H + DAY_HEADER_H + gridH + FOOTER_H
    return { columns, startHour, endHour, dayColW, width, height, gridH }
  },
  paint(ctx, api, layout, qrImg, { payload, creatorName }) {
    const { columns, startHour, endHour, dayColW, width, height, gridH } = layout
    const cols = columns.length
    const list = payload || []

    api.setFill('#f5f7fa')
    ctx.fillRect(0, 0, width, height)

    // 顶部标题带
    if (ctx.createLinearGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, HEADER_BAND_H)
      grad.addColorStop(0, '#4f8cff')
      grad.addColorStop(1, '#2196f3')
      api.setFill(grad)
    } else {
      api.setFill('#2196f3')
    }
    ctx.fillRect(0, 0, width, HEADER_BAND_H)

    api.setFill('rgba(255,255,255,0.92)')
    api.setTextAlign('left')
    api.setTextBaseline('top')
    api.setFont('600 26px sans-serif', 26)
    ctx.fillText(`${APP_BRAND} · 课程表`, 28, 34)

    api.setFill('#ffffff')
    api.setFont('800 40px "PingFang SC", sans-serif', 40)
    ctx.fillText(truncate(api, `来自 ${creatorName} 的分享`, width - 56), 28, 74)

    api.setFill('rgba(255,255,255,0.85)')
    api.setFont('400 24px sans-serif', 24)
    ctx.fillText(`共 ${list.length} 个日程，一起安排起来吧`, 28, 126)

    // 星期/日期表头行
    const dhY = HEADER_BAND_H
    api.setFill('#e8f1ff')
    ctx.fillRect(0, dhY, TIME_COL_W, DAY_HEADER_H)
    api.setFill('#90a4c4')
    api.setTextAlign('center')
    api.setTextBaseline('middle')
    api.setFont('600 20px sans-serif', 20)
    ctx.fillText('时间', TIME_COL_W / 2, dhY + DAY_HEADER_H / 2)

    columns.forEach((c, i) => {
      const x = TIME_COL_W + i * dayColW
      api.setFill(i % 2 === 0 ? '#f3f8ff' : '#e8f1ff')
      ctx.fillRect(x, dhY, dayColW, DAY_HEADER_H)
      api.setFill('#1f3a5f')
      api.setTextAlign('center')
      api.setTextBaseline('top')
      api.setFont('700 26px sans-serif', 26)
      ctx.fillText(c.week || '', x + dayColW / 2, dhY + 12)
      api.setFill('#7a90b0')
      api.setFont('400 20px sans-serif', 20)
      ctx.fillText(c.label || '', x + dayColW / 2, dhY + 44)
    })

    // 网格主体
    const gy0 = HEADER_BAND_H + DAY_HEADER_H
    api.setFill('#ffffff')
    ctx.fillRect(0, gy0, width, gridH)

    api.setStroke('#eef2f7')
    api.setLineWidth(1)
    for (let h = startHour; h <= endHour; h++) {
      const y = gy0 + (h - startHour) * HOUR_H
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      if (h < endHour) {
        api.setFill('#9aa7b8')
        api.setTextAlign('center')
        api.setTextBaseline('top')
        api.setFont('400 20px sans-serif', 20)
        ctx.fillText(`${h}:00`, TIME_COL_W / 2, y + 6)
      }
    }
    ctx.beginPath(); ctx.moveTo(0, gy0); ctx.lineTo(0, gy0 + gridH); ctx.stroke()
    for (let i = 0; i <= cols; i++) {
      const x = TIME_COL_W + i * dayColW
      ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy0 + gridH); ctx.stroke()
    }

    // 事件块
    const dateIndex = {}
    columns.forEach((c, i) => { dateIndex[c.date] = i })
    list.forEach((s, idx) => {
      const key = s?.date != null ? s.date : DateUtils.getDateFromDateTimeStr(s?.startTime || '', '')
      const di = dateIndex[key]
      if (di == null) return

      let sm = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', ''))
      let em = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', ''))
      if (sm == null) sm = startHour * 60
      if (em == null || em <= sm) em = sm + 60

      const top = gy0 + (sm - startHour * 60) / 60 * HOUR_H
      const blockH = Math.max(MIN_BLOCK_H, (em - sm) / 60 * HOUR_H)
      const x = TIME_COL_W + di * dayColW + 5
      const w = dayColW - 10

      drawRoundRectPath(ctx, x, top + 3, w, blockH - 6, 12)
      api.setFill(PALETTE[idx % PALETTE.length])
      ctx.fill()

      api.setFill('#ffffff')
      api.setTextAlign('left')
      api.setTextBaseline('top')
      const tx = x + 12
      let ty = top + 12
      api.setFont('700 22px sans-serif', 22)
      ctx.fillText(truncate(api, s?.itemTitle || '日程', w - 20), tx, ty)

      if (blockH >= 72) {
        const start = DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', '')
        const end = DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', '')
        const timeText = start ? (end ? `${start}-${end}` : start) : ''
        if (timeText) {
          ty += 30
          api.setFill('rgba(255,255,255,0.92)')
          api.setFont('400 19px sans-serif', 19)
          ctx.fillText(truncate(api, timeText, w - 20), tx, ty)
        }
        if (blockH >= 108 && s?.location) {
          ty += 24
          api.setFill('rgba(255,255,255,0.85)')
          ctx.fillText(truncate(api, `📍 ${s.location}`, w - 20), tx, ty)
        }
      }
    })

    // 底部二维码卡片
    const footerY = gy0 + gridH + 24
    const fX = 24
    const fW = width - 48
    const fH = FOOTER_H - 48
    drawRoundRectPath(ctx, fX, footerY, fW, fH, 20)
    api.setFill('#ffffff')
    ctx.fill()

    const qrSize = 170
    const qrX = fX + (fW - qrSize) / 2
    const qrY = footerY + 28
    if (qrImg) {
      try { ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize) } catch (e) { /* ignore */ }
    } else {
      api.setFill('#f1f5f9')
      ctx.fillRect(qrX, qrY, qrSize, qrSize)
    }

    api.setFill('#1f2937')
    api.setTextAlign('center')
    api.setTextBaseline('top')
    api.setFont('600 26px sans-serif', 26)
    ctx.fillText('长按识别二维码 · 收下课程表', width / 2, qrY + qrSize + 22)
    api.setFill('#94a3b8')
    api.setFont('400 20px sans-serif', 20)
    ctx.fillText(`用微信打开 ${APP_BRAND} 小程序`, width / 2, qrY + qrSize + 56)
  }
}

export const renderers = { taskList, scheduleTimetable }
