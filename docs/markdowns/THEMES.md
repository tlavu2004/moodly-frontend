# Themes and semantic colors

Choose System (default), Light or Dark in the landing header or app toolbar.
`moodly.theme` stores an explicit preference. System follows OS changes while the
page is open. Blocked storage keeps the preference for the current session.
Other tabs update when the preference changes or storage is cleared.

`public/theme-init.js` is a small blocking, same-origin script in the document
head. It applies the resolved theme and native `color-scheme` before React/CSS
loads. The React theme store uses the same preference key and resolution rules.
Keep both paths in sync; the browser test covers startup without React.

All component colors use the semantic `--color-*` tokens in `src/index.css`.
Dark mode overrides the full semantic palette on `html[data-theme=dark]`.
Use `primary-foreground` on primary surfaces and `success-foreground` on success
surfaces; errors use `danger` / `danger-soft`. Avoid palette-specific classes such
as `text-white` or `text-red-700`, including for badges and validation feedback.
Native inputs and select menus inherit the resolved browser color scheme.
