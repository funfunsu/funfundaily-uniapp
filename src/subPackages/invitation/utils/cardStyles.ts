export interface CardStyle {
  id: string
  label: string
  icon: string
  cardBg: string
  titleColor: string
  badgeBg: string
  badgeColor: string
  metaColor: string
  bodyColor: string
  dividerColor: string
}

export const CARD_STYLES: CardStyle[] = [
  {
    id: 'classic',
    label: '经典蓝',
    icon: '🎀',
    cardBg: '#ffffff',
    titleColor: '#1d2129',
    badgeBg: '#e6f3ff',
    badgeColor: '#2196f3',
    metaColor: '#4e5969',
    bodyColor: '#1d2129',
    dividerColor: '#e5e6eb'
  },
  {
    id: 'playful',
    label: '派对欢乐',
    icon: '🎉',
    cardBg: 'linear-gradient(160deg, #fff7d6, #ffe0e9)',
    titleColor: '#7c3aed',
    badgeBg: '#fde68a',
    badgeColor: '#b45309',
    metaColor: '#92400e',
    bodyColor: '#3b3052',
    dividerColor: '#f7c5d4'
  },
  {
    id: 'soft',
    label: '柔和粉嫩',
    icon: '🌷',
    cardBg: 'linear-gradient(160deg, #fff1f5, #fdf2f8)',
    titleColor: '#9d174d',
    badgeBg: '#fce7f3',
    badgeColor: '#be185d',
    metaColor: '#9d174d',
    bodyColor: '#4a044e',
    dividerColor: '#fbcfe8'
  },
  {
    id: 'warm',
    label: '暖意金棕',
    icon: '🥂',
    cardBg: 'linear-gradient(160deg, #fff7ed, #fef3c7)',
    titleColor: '#9a3412',
    badgeBg: '#fed7aa',
    badgeColor: '#9a3412',
    metaColor: '#92400e',
    bodyColor: '#451a03',
    dividerColor: '#fdba74'
  },
  {
    id: 'elegant',
    label: '雅致深绿',
    icon: '🌿',
    cardBg: 'linear-gradient(160deg, #f0fdf4, #ecfccb)',
    titleColor: '#14532d',
    badgeBg: '#bbf7d0',
    badgeColor: '#166534',
    metaColor: '#166534',
    bodyColor: '#052e16',
    dividerColor: '#86efac'
  },
  {
    id: 'modern',
    label: '极简黑白',
    icon: '⬛',
    cardBg: '#fafafa',
    titleColor: '#0f172a',
    badgeBg: '#0f172a',
    badgeColor: '#ffffff',
    metaColor: '#475569',
    bodyColor: '#0f172a',
    dividerColor: '#cbd5e1'
  }
]

export const DEFAULT_STYLE_ID = 'classic'

export function resolveCardStyle(id: string | undefined | null): CardStyle {
  if (!id) return CARD_STYLES[0]
  return CARD_STYLES.find((s) => s.id === id) || CARD_STYLES[0]
}
