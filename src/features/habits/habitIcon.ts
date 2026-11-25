export const habitIconOptions = ['🌿', '💧', '📖', '🧘', '🏃', '🥗', '😴', '✍️']

const legacyIcons = new Map([['walk', '🚶'], ['book', '📖']])
const emoji = /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|[0-9#*]\uFE0F?\u20E3)[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\u20E3]*$/u

export function habitIcon(value?: string | null): string {
  if (!value) return '🌿'
  return legacyIcons.get(value) ?? (emoji.test(value) ? value : '🌿')
}
