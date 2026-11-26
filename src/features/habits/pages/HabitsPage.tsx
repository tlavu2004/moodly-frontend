import { t, useLocale, formatNumber, countMessage } from '../../../i18n/index.ts'
import { RequestRetry } from '../../../components/ui/RequestRetry.tsx'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { SaveRecovery } from '../../../components/ui/SaveRecovery.tsx'
import { ApiRequestError, isSaveOutcomeUnknown } from '../../../api/errors.ts'
import { Icon } from '../../../components/ui/Icon.tsx'
import { useHabits } from '../hooks/useHabits.ts'

import { habitIcon, habitIconOptions } from '../habitIcon.ts'

type UnconfirmedHabitSave =
  | { kind: 'form'; id: string | null; name: string; icon: string; existing: Set<string> }
  | { kind: 'status'; id: string; active: boolean }

export function HabitsPage() {
  useLocale()
  const { habits, streaks, streakRetryAt, isLoading, error, reload, retryAt, add, change, archived, refresh } = useHabits()
  const [isCreating, setIsCreating] = useState(false)
  const [uncertain, setUncertain] = useState<UnconfirmedHabitSave | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; icon?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🌿')
  const submitPending = useRef(false)
  const newHabitButton = useRef<HTMLButtonElement>(null)
  const formTrigger = useRef<HTMLButtonElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating) nameInput.current?.focus()
  }, [isCreating, editingId])

  function closeCreateForm() {
    setUncertain(null)
    setEditingId(null)
    setFormError(null)
    setFieldErrors({})
    setIsCreating(false)
    requestAnimationFrame(() => {
      const trigger = formTrigger.current
      if (trigger?.isConnected) trigger.focus()
      else newHabitButton.current?.focus()
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitPending.current || isLoading || uncertain) return
    if (!name.trim()) {
      setFieldErrors({ name: "Give your habit a name." })
      nameInput.current?.focus()
      return
    }
    submitPending.current = true
    setIsSaving(true); setFormError(null); setFieldErrors({}); setStatusMessage(null)
    try {
      if (editingId) await change(editingId, { name: name.trim(), icon: icon || undefined })
      else await add({ name: name.trim(), icon, targetFrequency: 'DAILY' })
      closeCreateForm()
    }
    catch (reason) {
      if (editingId && reason instanceof ApiRequestError && reason.code === 'HABIT_CONFLICT') {
        closeCreateForm()
        setActionError(getUserFacingError(reason, 'Unable to update this habit.'))
        return
      }
      if (reason instanceof ApiRequestError && reason.status === 400) {
        const name = reason.fieldErrors.find((item) => item.field === 'name')?.message
        const icon = reason.fieldErrors.find((item) => item.field === 'icon')?.message
        if (name || icon) {
          setFieldErrors({ name, icon })
          if (name) nameInput.current?.focus()
          return
        }
      }
      if (isSaveOutcomeUnknown(reason)) {
        setUncertain({ kind: 'form', id: editingId, name: name.trim(), icon, existing: new Set([...habits, ...archived].map((habit) => habit.id)) })
        return
      }
      setFormError(getUserFacingError(reason, editingId ? 'Unable to update this habit.' : 'Unable to create your habit.'))
    }
    finally { submitPending.current = false; setIsSaving(false) }
  }

  async function checkHabit() {
    if (!uncertain) return
    const latest = await refresh()
    if (uncertain.kind === 'status') {
      const current = latest.habits.find((habit) => habit.id === uncertain.id)
      setUncertain(null)
      setStatusMessage(current?.active === uncertain.active
        ? 'The submitted values are already on the server.'
        : 'The server has different values. Review the list before saving again.')
      return
    }
    const match = latest.habits.some((habit) =>
      (uncertain.id ? habit.id === uncertain.id : !uncertain.existing.has(habit.id)) &&
      habit.name === uncertain.name && (habit.icon ?? '') === uncertain.icon,
    )
    setUncertain(null)
    if (match) {
      closeCreateForm()
      setStatusMessage('The submitted values are already on the server.')
    } else if (uncertain.id && !latest.habits.some((habit) => habit.id === uncertain.id && habit.active)) {
      setFormError('This habit is no longer active. Copy your draft before closing the form.')
    } else {
      setFormError('The server has different values. Review the list before saving again.')
    }
  }

  async function changeStatus(id: string, action: 'archive' | 'restore') {
    if (submitPending.current || isLoading || uncertain) return
    submitPending.current = true
    setIsSaving(true)
    setActionError(null)
    setStatusMessage(null)
    try {
      await change(id, action)
      requestAnimationFrame(() => newHabitButton.current?.focus())
    } catch (reason) {
      if (isSaveOutcomeUnknown(reason)) setUncertain({ kind: 'status', id, active: action === 'restore' })
      else setActionError(getUserFacingError(reason, 'Unable to update this habit.'))
    } finally {
      submitPending.current = false
      setIsSaving(false)
    }
  }

  function openCreateForm(event: React.MouseEvent<HTMLButtonElement>) {
    formTrigger.current = event.currentTarget
    setFieldErrors({})
    setEditingId(null)
    setName('')
    setIcon('🌿')
    setFormError(null)
    setIsCreating(true)
  }

  return (
    <main className="page-container pb-24 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("Your rituals")}</p><h1 className="page-title mt-3">{t("Habits that feel like you")}</h1><p className="page-subtitle">{t("Keep them small, meaningful, and easy to return to.")}</p></div><button ref={newHabitButton} className="button-primary" type="button" disabled={isSaving || Boolean(uncertain)} onClick={openCreateForm}><Icon name="plus" className="size-4" />{t("New habit")}</button></div>

      {isCreating && <section className="card mt-8 p-5 sm:p-7" aria-labelledby="new-habit-title"><div className="flex items-center justify-between"><div><p className="eyebrow">{t("Create a ritual")}</p><h2 id="new-habit-title" className="mt-2 text-xl font-bold">{t(editingId ? "Edit habit" : "What would you like to nurture?")}</h2></div><button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground-muted hover:bg-surface-muted" disabled={isSaving || Boolean(uncertain)} onClick={closeCreateForm}>{t("Cancel")}</button></div><form className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]" onSubmit={submit}><div><label className="field-label" htmlFor="habit-name">{t("Habit name")}</label><input ref={nameInput} id="habit-name" className="field-input" value={name} readOnly={isSaving || Boolean(uncertain)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "habit-name-error" : undefined} maxLength={80} placeholder={t("e.g. Morning walk")} onChange={(event) => setName(event.target.value)} />{fieldErrors.name && <p id="habit-name-error" role="alert" className="mt-2 text-sm text-danger">{t(fieldErrors.name)}</p>}<p className="mt-2 text-xs text-foreground-muted">{t("Start with an action you can do on your busiest day.")}</p></div><fieldset disabled={isSaving || Boolean(uncertain)} aria-describedby={fieldErrors.icon ? "habit-icon-error" : undefined}><legend className="field-label">{t("Choose an icon")}</legend><div className="flex flex-wrap gap-2">{habitIconOptions.map((option) => <button key={option} type="button" aria-label={t('Use {icon} icon', { icon: option })} aria-pressed={icon === option} className={`grid size-11 place-items-center rounded-xl text-xl ${icon === option ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-muted'}`} onClick={() => setIcon(option)}>{option}</button>)}</div>{fieldErrors.icon && <p id="habit-icon-error" role="alert" className="mt-2 text-sm text-danger">{t(fieldErrors.icon)}</p>}</fieldset><div><span className="field-label">{t("Rhythm")}</span><p className="field-input" aria-label={t("Rhythm")}>{t("Every day")}</p></div><div className="flex items-end"><button type="submit" className="button-primary w-full" disabled={isSaving || isLoading || Boolean(uncertain) || Boolean(editingId && (error || !habits.some((habit) => habit.id === editingId)))}>{isSaving ? t("Saving…") : t(editingId ? "Save habit" : "Create habit")}</button></div>{formError && <p className="text-sm text-danger lg:col-span-2" role="alert">{t(formError)}</p>}</form>{uncertain?.kind === 'form' && <SaveRecovery check={checkHabit} />}</section>}

      {uncertain?.kind === 'status' && <SaveRecovery check={checkHabit} />}
      {statusMessage && <p className="mt-4" role="status">{t(statusMessage)}</p>}
      {actionError && <p className="mt-4 text-danger" role="alert">{t(actionError)}</p>}
      <section className="mt-8" aria-live="polite">{!isLoading && !error && habits.some((habit) => streaks[habit.id] === undefined) && <div className="mb-4"><p className="text-sm text-foreground-muted">{t("Some streaks could not be loaded.")}</p><RequestRetry retryAt={streakRetryAt} onRetry={reload} /></div>}
        {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={t("Loading habits")}>{[1,2,3].map((item) => <div key={item} className="card h-40 animate-pulse bg-surface-muted" />)}</div>}
        {!isLoading && error && <div className="card p-8 text-center" role="alert"><span className="text-3xl">🌧️</span><h2 className="mt-3 text-lg font-bold">{t("We could not load your habits")}</h2><p className="mt-2 text-sm text-foreground-muted">{t(error)}</p><RequestRetry retryAt={retryAt} onRetry={reload} /></div>}
        {!isLoading && !error && habits.length === 0 && <div className="card p-10 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-3xl">🌱</span><h2 className="mt-5 text-xl font-bold">{t("Plant your first tiny habit")}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">{t("A glass of water, two mindful breaths, one page—small is a wonderful place to start.")}</p><button className="button-primary mt-6" disabled={isSaving || Boolean(uncertain)} onClick={openCreateForm}><Icon name="plus" className="size-4" />{t("Create first habit")}</button></div>}
        {!isLoading && !error && habits.length > 0 && <><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-foreground-muted">{countMessage('{count} active habit', '{count} active habits', habits.length)}</p><p className="text-xs text-foreground-muted">{t("Streaks update after each daily check-in")}</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{habits.map((habit) => { const streak = habit.id ? streaks[habit.id] : undefined; return <article className="card p-5" key={habit.id ?? habit.name}><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-2xl">{habitIcon(habit.icon)}</span><span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">{t("Active")}</span></div><h2 className="mt-5 text-lg font-bold">{habit.name}</h2><p className="mt-1 text-sm capitalize text-foreground-muted">{habit.targetFrequency === 'DAILY' ? t('Every day') : t('Your own rhythm')}</p><div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-foreground-muted"><span aria-hidden="true">{streak === undefined ? '—' : streak > 0 ? '🔥' : '🌱'}</span><strong className="text-foreground">{streak === undefined ? t("Streak unavailable") : streak > 0 ? t('{count}-day streak', { count: formatNumber(streak) }) : t("Ready to begin")}</strong></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="button-secondary" disabled={isSaving || Boolean(uncertain)} onClick={(event) => {
              formTrigger.current = event.currentTarget
              setFieldErrors({})
              setName(habit.name)
              setIcon(habit.icon ?? '')
              setFormError(null)
              setActionError(null)
              setEditingId(habit.id)
              setIsCreating(true)
            }}>{t("Edit habit")}</button>
            <button type="button" className="button-secondary" disabled={isSaving || isCreating || Boolean(uncertain)} onClick={() => void changeStatus(habit.id, 'archive')}>{t("Archive")}</button>
          </div>
        </article> })}</div></>}
      </section>
      {!isLoading && !error && <section className="mt-8">
        <button type="button" className="button-secondary" aria-expanded={showArchived} aria-controls="archived-habits" onClick={() => setShowArchived(!showArchived)}>{t("Archived habits")}</button>
        <div id="archived-habits" hidden={!showArchived} className={showArchived ? "mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
          {archived.length === 0 && <p className="text-foreground-muted">{t("No archived habits.")}</p>}
          {archived.map((habit) => <article key={habit.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <h2 className="font-bold"><span aria-hidden="true">{habitIcon(habit.icon)}</span> {habit.name}</h2>
            <button type="button" className="button-secondary" disabled={isSaving || isCreating || Boolean(uncertain)} onClick={() => void changeStatus(habit.id, 'restore')}>{t("Restore")}</button>
          </article>)}
        </div>
      </section>}
    </main>
  )
}
