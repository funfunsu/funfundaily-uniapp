// 分享海报的跨平台 canvas 公共工具：被 share-poster 组件与各 renderer 复用。

export const isH5 = () => typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'

// 跨平台 canvas 样式 API（兼容旧版 uni canvas 的 setXxx 写法）
export function makeCanvasApi(ctx) {
  const legacy = typeof ctx.setFillStyle === 'function' && typeof ctx.fillStyle === 'undefined'
  return {
    legacy,
    setFill(v) { if (legacy) ctx.setFillStyle(v); else ctx.fillStyle = v },
    setStroke(v) { if (legacy) ctx.setStrokeStyle(v); else ctx.strokeStyle = v },
    setLineWidth(v) { if (legacy) ctx.setLineWidth(v); else ctx.lineWidth = v },
    setTextAlign(v) { if (legacy && ctx.setTextAlign) ctx.setTextAlign(v); else if (!legacy) ctx.textAlign = v },
    setTextBaseline(v) { if (legacy && ctx.setTextBaseline) ctx.setTextBaseline(v); else if (!legacy) ctx.textBaseline = v },
    setFont(spec, size) { if (legacy) ctx.setFontSize(size); else ctx.font = spec },
    measureWidth(text) {
      if (ctx.measureText) { try { return ctx.measureText(text).width } catch (e) { /* ignore */ } }
      return String(text || '').length * 12
    }
  }
}

export function drawRoundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export function truncate(api, text, maxWidth) {
  const str = String(text == null ? '' : text)
  if (api.measureWidth(str) <= maxWidth) return str
  let result = str
  while (result.length > 1 && api.measureWidth(result + '…') > maxWidth) {
    result = result.slice(0, -1)
  }
  return result + '…'
}
