import { useState, type FormEvent } from 'react'
import { Icon } from '../../../components/ui/Icon.tsx'
import { useHabits } from '../hooks/useHabits.ts'

const iconOptions = ['🌿', '💧', '📖', '🧘', '🏃', '🥗', '😴', '✍️']

export function HabitsPage() {
  const { habits, streaks, isLoading, error, reload, add } = useHabits()
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🌿')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setFormError('Give your habit a name.'); return }
    setIsSaving(true); setFormError(null)
    try { await add({ name: name.trim(), icon, targetFrequency: 'DAILY' }); setName(''); setIsCreating(false) }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to create your habit.') }
    finally { setIsSaving(false) }
  }

  return (
    <main className="page-container pb-24 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Your rituals</p><h1 className="page-title mt-3">Habits that feel like you</h1><p className="page-subtitle">Keep them small, meaningful, and easy to return to.</p></div><button className="button-primary" type="button" onClick={() => setIsCreating(true)}><Icon name="plus" className="size-4" />New habit</button></div>

      {isCreating && <section className="card mt-8 p-5 sm:p-7" aria-labelledby="new-habit-title"><div className="flex items-center justify-between"><div><p className="eyebrow">Create a ritual</p><h2 id="new-habit-title" className="mt-2 text-xl font-bold">What would you like to nurture?</h2></div><button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground-muted hover:bg-surface-muted" onClick={() => setIsCreating(false)}>Cancel</button></div><form className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]" onSubmit={submit}><div><label className="field-label" htmlFor="habit-name">Habit name</label><input id="habit-name" className="field-input" value={name} maxLength={80} placeholder="e.g. Morning walk" onChange={(event) => setName(event.target.value)} autoFocus /><p className="mt-2 text-xs text-foreground-muted">Start with an action you can do on your busiest day.</p></div><div><span className="field-label">Choose an icon</span><div className="flex flex-wrap gap-2">{iconOptions.map((option) => <button key={option} type="button" aria-label={`Use ${option} icon`} aria-pressed={icon === option} className={`grid size-11 place-items-center rounded-xl text-xl ${icon === option ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-muted'}`} onClick={() => setIcon(option)}>{option}</button>)}</div></div><div><span className="field-label">Rhythm</span><p className="field-input" aria-label="Rhythm">Every day</p></div><div className="flex items-end"><button className="button-primary w-full" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create habit'}</button></div>{formError && <p className="text-sm text-red-700 lg:col-span-2" role="alert">{formError}</p>}</form></section>}

      <section className="mt-8" aria-live="polite">
        {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading habits">{[1,2,3].map((item) => <div key={item} className="card h-40 animate-pulse bg-surface-muted" />)}</div>}
        {!isLoading && error && <div className="card p-8 text-center" role="alert"><span className="text-3xl">🌧️</span><h2 className="mt-3 text-lg font-bold">We couldn’t load your habits</h2><p className="mt-2 text-sm text-foreground-muted">{error}</p><button className="button-secondary mt-5" onClick={() => void reload()}>Try again</button></div>}
        {!isLoading && !error && habits.length === 0 && <div className="card p-10 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-3xl">🌱</span><h2 className="mt-5 text-xl font-bold">Plant your first tiny habit</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">A glass of water, two mindful breaths, one page—small is a wonderful place to start.</p><button className="button-primary mt-6" onClick={() => setIsCreating(true)}><Icon name="plus" className="size-4" />Create first habit</button></div>}
        {!isLoading && !error && habits.length > 0 && <><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-foreground-muted">{habits.length} active {habits.length === 1 ? 'habit' : 'habits'}</p><p className="text-xs text-foreground-muted">Streaks update after each daily check-in</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{habits.map((habit) => { const streak = habit.id ? streaks[habit.id] ?? 0 : 0; return <article className="card p-5" key={habit.id ?? habit.name}><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-2xl">{habit.icon || '🌿'}</span><span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">Active</span></div><h2 className="mt-5 text-lg font-bold">{habit.name}</h2><p className="mt-1 text-sm capitalize text-foreground-muted">{habit.targetFrequency?.toLowerCase().replaceAll('_', ' ') || 'Your own rhythm'}</p><div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-foreground-muted"><span aria-hidden="true">{streak > 0 ? '🔥' : '🌱'}</span><strong className="text-foreground">{streak > 0 ? `${streak}-day streak` : 'Ready to begin'}</strong></div></article> })}</div></>}
      </section>
    </main>
  )
}
