// Run before styles/modules so a saved dark preference never paints the light theme.
(() => {
  let preference = 'system'
  try {
    const saved = localStorage.getItem('moodly.theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved
  } catch { /* Storage is optional. */ }
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
})()
