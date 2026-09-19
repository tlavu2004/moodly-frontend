import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router'
import { Icon } from '../../../components/ui/Icon.tsx'

export function DashboardPage() {
  const { user } = useAuth0()
  const firstName = user?.given_name ?? user?.name?.split(' ')[0] ?? 'friend'
  return (
    <main className="page-container pb-24 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Your space</p><h1 className="page-title mt-3">Good morning, {firstName} <span aria-hidden="true">🌿</span></h1><p className="page-subtitle">A fresh day to take care of yourself.</p></div><Link className="button-primary" to="/today">Daily check-in <Icon name="arrow-right" className="size-4" /></Link></div>
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="card overflow-hidden p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-foreground-muted">Today’s rhythm</p><h2 className="mt-1 text-2xl font-bold">Keep the gentle momentum</h2></div><span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-2xl">☀️</span></div><div className="mt-8 flex items-end gap-5"><div className="relative grid size-32 shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--color-primary)_0_68%,var(--color-surface-muted)_68%)]"><div className="grid size-24 place-items-center rounded-full bg-surface text-center"><span><strong className="block text-2xl">68%</strong><span className="text-xs text-foreground-muted">complete</span></span></div></div><div><p className="text-sm leading-6 text-foreground-muted">You’ve completed <strong className="text-foreground">2 of 3 habits</strong> today. One small step left.</p><Link to="/today" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">Finish check-in <Icon name="arrow-right" className="size-4" /></Link></div></div></article>
        <article className="card p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-foreground-muted">Current mood</p><h2 className="mt-1 text-2xl font-bold">Feeling good</h2></div><span className="text-5xl">🙂</span></div><div className="mt-8 rounded-2xl bg-primary-soft p-4"><p className="text-sm italic leading-6 text-primary-dark">“A slow morning and a clear head. I feel ready for today.”</p></div><Link to="/today" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">Update mood <Icon name="arrow-right" className="size-4" /></Link></article>
      </section>
      <section className="mt-5 grid gap-5 md:grid-cols-3">{[['🔥','7 days','Best current streak','/habits'],['🌈','4.2 / 5','Average mood','/stats'],['📝','18','Reflections this month','/entries']].map(([icon,value,label,to]) => <Link key={label} to={to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-2xl">{icon}</span><span><strong className="block text-xl">{value}</strong><span className="text-sm text-foreground-muted">{label}</span></span></Link>)}</section>
    </main>
  )
}
