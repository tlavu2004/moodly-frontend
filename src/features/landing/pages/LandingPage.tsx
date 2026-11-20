import { ThemeSelect } from '../../../theme/ThemeSelect.tsx'
import { LanguageSelect } from '../../../i18n/LanguageSelect.tsx'
import { t, useLocale, formatDate } from '../../../i18n/index.ts'
import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router'
import { Icon } from '../../../components/ui/Icon.tsx'

export function LandingPage() {
  useLocale()
  const { isAuthenticated, logout } = useAuth0()
  return (
    <main className="min-h-svh overflow-hidden bg-background">
      <header className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link className="flex items-center gap-2 text-xl font-bold tracking-tight" to="/"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon name="sparkles" className="size-5" /></span>{t("Moodly")}</Link>
        <div className="flex flex-wrap gap-3"><LanguageSelect /><ThemeSelect /></div>
        {isAuthenticated ? <div className="flex flex-wrap items-center gap-2">
          <Link className="button-secondary" to="/dashboard">{t("Open dashboard")}</Link>
          <button className="button-secondary" type="button" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>{t("Log out")}</button>
        </div> : <Link className="button-secondary" to="/login">{t("Sign in")}</Link>}
      </header>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
        <div className="relative z-10">
          <p className="eyebrow"><Icon name="sparkles" className="size-4" />{t("A calmer way to grow")}</p>
          <h1 className="mt-6 max-w-xl text-5xl font-bold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">{t("Small habits.")}<br /><span className="text-primary">{t("Brighter days.")}</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-foreground-muted">{t("Moodly brings your moods, daily rituals, and reflections into one gentle space—so progress feels natural, not pressured.")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            {isAuthenticated ? <Link className="button-primary" to="/dashboard">{t("Go to your dashboard")} <Icon name="arrow-right" className="size-4" /></Link> : <Link className="button-primary" to="/signup">{t("Start your journey")} <Icon name="arrow-right" className="size-4" /></Link>}
            <a className="button-secondary" href="#how-it-works">{t("See how it works")}</a>
          </div>
          <p className="mt-4 text-xs text-foreground-muted">{t("Free to begin · Private by design · Takes less than 2 minutes a day")}</p>
        </div>
        <div className="relative mx-auto w-full max-w-lg" aria-label={t("Moodly daily check-in preview")}>
          <div className="absolute -left-16 top-16 size-48 rounded-full bg-secondary/25 blur-3xl" /><div className="absolute -right-12 bottom-0 size-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative rotate-2 rounded-[2rem] border border-border bg-surface/90 p-5 shadow-2xl shadow-primary/10 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">{formatDate('2025-09-19', { weekday: 'long', month: 'short', day: 'numeric' })}</p><h2 className="mt-1 text-xl font-bold">{t("How are you feeling?")}</h2></div><span className="text-3xl">🌤️</span></div>
            <div className="mt-7 grid grid-cols-5 gap-2">{['😞','😕','😌','🙂','🤩'].map((mood, index) => <span key={mood} className={`grid aspect-square place-items-center rounded-2xl text-2xl ${index === 3 ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : 'bg-surface-muted'}`}>{mood}</span>)}</div>
            <div className="mt-8 flex items-center justify-between"><h3 className="font-bold">{t("Today’s habits")}</h3><span className="text-sm font-semibold text-primary">{t("2 of 3")}</span></div>
            <div className="mt-3 space-y-2">{[['💧',t("Drink water"),true],['🌿',t("10 min outside"),true],['📖',t("Read a few pages"),false]].map(([icon,label,done]) => <div key={String(label)} className="flex items-center gap-3 rounded-xl bg-background p-3"><span>{icon}</span><span className="flex-1 text-sm font-medium">{t(String(label))}</span><span className={`grid size-6 place-items-center rounded-full ${done ? 'bg-success text-success-foreground' : 'border-2 border-border'}`}>{done && <Icon name="check" className="size-4" />}</span></div>)}</div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="border-t border-border bg-surface px-5 py-16 sm:px-8"><div className="mx-auto grid max-w-6xl gap-8 text-center sm:grid-cols-3">{[['🌱',t("Build gently"),t("Choose rituals that fit your real life.")],['🫶',t("Check in honestly"),t("Capture your mood without judgment.")],['✨',t("Notice patterns"),t("See what helps you feel like yourself.")]].map(([icon,title,copy]) => <article key={t(title)}><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-2xl">{icon}</span><h2 className="mt-4 font-bold">{t(title)}</h2><p className="mt-2 text-sm leading-6 text-foreground-muted">{t(copy)}</p></article>)}</div></section>
    </main>
  )
}
