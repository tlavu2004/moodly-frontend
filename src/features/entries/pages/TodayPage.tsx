import { t, useLocale, formatNumber } from '../../../i18n/index.ts'
import { habitIcon } from '../../habits/habitIcon.ts'
import { RequestRetry } from '../../../components/ui/RequestRetry.tsx'
import { useEffect, useRef, useState } from 'react'
import { getUserFacingError } from '../../../api/errorMessages.ts'
import { SaveRecovery } from '../../../components/ui/SaveRecovery.tsx'
import type { SetMoodRequest } from '../../../api/openapi/types.api.ts'
import { ApiRequestError, isSaveOutcomeUnknown } from '../../../api/errors.ts'
import { Icon } from '../../../components/ui/Icon.tsx'
import { CheckInDateChanged, useTodayEntry } from '../hooks/useTodayEntry.ts'

const moods = [{ score: 1, emoji: '😞', label: 'Rough' }, { score: 2, emoji: '😕', label: 'Low' }, { score: 3, emoji: '😌', label: 'Okay' }, { score: 4, emoji: '🙂', label: 'Good' }, { score: 5, emoji: '🤩', label: 'Great' }]
const tags = ['Calm', 'Energized', 'Grateful', 'Tired', 'Anxious', 'Focused']
type UnconfirmedSave = { date: string } & (
  { kind: 'mood'; input: SetMoodRequest } |
  { kind: 'habit'; id: string; done: boolean; note: string | null; editing: boolean }
)
type MutationMessage = { text: string; kind: 'success' | 'error' }

function MutationLiveRegion({ message, label }: { message: MutationMessage | null; label: string }) {
  useLocale()
  return <div aria-label={t(String(label))} aria-live={message?.kind === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{message && <p className={`text-sm ${message.kind === 'error' ? 'text-danger' : 'text-foreground-muted'}`}>{t(message.text)}</p>}</div>
}

export function TodayPage() {
  useLocale()
  const { date, entry, habits, isLoading, error, reload, retryAt, updateMood, toggleHabit, refresh } = useTodayEntry()
  const [score, setScore] = useState<number | null>(null); const [note, setNote] = useState(''); const [selectedTags, setSelectedTags] = useState<string[]>([]); const [isSaving, setIsSaving] = useState(false); const [savingHabitId, setSavingHabitId] = useState<string | null>(null); const [moodMessage, setMoodMessage] = useState<MutationMessage | null>(null); const [habitMessage, setHabitMessage] = useState<MutationMessage | null>(null)
  const [uncertain, setUncertain] = useState<UnconfirmedSave | null>(null)
  const [orphanedNote, setOrphanedNote] = useState<string | null>(null)
  const [review, setReview] = useState<string | null>(null)
  const submitPending = useRef(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [habitNote, setHabitNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const noteField = useRef<HTMLTextAreaElement>(null)
  const noteTrigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const restoreHeadingFocus = useRef(false)
  const mood = entry?.mood
  const savedScore = mood?.score
  const savedNote = mood?.note
  const [savedMoodKey, setSavedMoodKey] = useState<string | undefined>(undefined)
  const moodKey = date ? JSON.stringify([date, mood]) : undefined
  if (moodKey !== undefined && moodKey !== savedMoodKey) {
    setSavedMoodKey(moodKey)
    if (uncertain?.kind !== 'mood') {
      setScore(savedScore ?? null)
      setNote(savedNote ?? '')
      setSelectedTags(mood?.tags ?? [])
    }
  }
  const logs = new Map(entry?.habits?.map((log) => [log.habitId, log]))
  const activeHabits = habits.filter((habit) => habit.active)
  const completed = activeHabits.filter((habit) => logs.get(habit.id)?.done).length
  const pending = isSaving || savingHabitId !== null || Boolean(uncertain)

  useEffect(() => {
    if (editingHabitId) noteField.current?.focus()
  }, [editingHabitId])

  useEffect(() => {
    if (!isLoading && restoreHeadingFocus.current) {
      restoreHeadingFocus.current = false
      heading.current?.focus()
    }
  }, [isLoading])

  function closeNote() {
    setEditingHabitId(null)
    setNoteError(null)
    requestAnimationFrame(() => noteTrigger.current?.focus())
  }
  async function save() {
    if (submitPending.current || uncertain) return
    if (!score) {
      setMoodMessage({ text: 'Choose how you feel first.', kind: 'error' })
      return
    }
    const input = { score, note: note.trim() || undefined, tags: selectedTags }
    submitPending.current = true
    setIsSaving(true)
    setMoodMessage(null)
    setReview(null)
    try {
      await updateMood(input)
      setMoodMessage({ text: 'Your check-in is saved. Be proud of showing up.', kind: 'success' })
    } catch (reason) {
      if (date && isSaveOutcomeUnknown(reason)) setUncertain({ kind: 'mood', date, input })
      else if (reason instanceof CheckInDateChanged) setReview(reason.message)
      else setMoodMessage({ text: getUserFacingError(reason, 'Unable to save your check-in.'), kind: 'error' })
    } finally {
      submitPending.current = false
      setIsSaving(false)
    }
  }

  async function checkSave() {
    if (!uncertain) return
    const { date: latestDate, entry: latest, habits: latestHabits } = await refresh()
    const sameDate = latestDate === uncertain.date
    const savedMood = latest?.mood
    const savedLog = uncertain.kind === 'habit' ? latest?.habits?.find((log) => log.habitId === uncertain.id) : undefined
    const match = sameDate && (uncertain.kind === 'mood'
      ? savedMood?.score === uncertain.input.score &&
        (savedMood?.note || undefined) === uncertain.input.note &&
        JSON.stringify([...(savedMood?.tags ?? [])].sort()) === JSON.stringify([...(uncertain.input.tags ?? [])].sort())
      : savedLog?.done === uncertain.done && (savedLog.note || null) === uncertain.note)
    // Record which server mood was reviewed without replacing the user's draft.
    if (uncertain.kind === 'mood') setSavedMoodKey(JSON.stringify([latestDate, savedMood]))
    setUncertain(null)
    if (match) {
      if (uncertain.kind === 'habit' && uncertain.editing) closeNote()
      setReview('The submitted values are already on the server.')
      return
    }
    if (!sameDate) {
      setReview('The calendar day changed. Review the date before saving your draft.')
    } else {
      setReview('The server has different values. Review the saved data before saving again.')
    }
    if (uncertain.kind === 'habit' && uncertain.editing && !savedLog &&
        !latestHabits.some((habit) => habit.id === uncertain.id && habit.active)) {
      setEditingHabitId(null)
      setOrphanedNote(habitNote)
      setReview('This habit is no longer available to log.')
    }
  }

  async function changeHabit(habitId: string, done: boolean, replacement?: string | null) {
    if (submitPending.current || uncertain) return
    submitPending.current = true
    setSavingHabitId(habitId)
    setHabitMessage(null)
    setReview(null)
    setNoteError(null)
    try {
      if (replacement === undefined) await toggleHabit(habitId, done)
      else await toggleHabit(habitId, done, replacement)
      if (replacement !== undefined) closeNote()
      const feedback = replacement === null ? 'Habit note removed.' : 'Habit note saved.'
      setHabitMessage({
        text: replacement === undefined ? (done ? 'Habit completed—nice work.' : 'Habit marked as not complete.') : feedback,
        kind: 'success',
      })
    } catch (reason) {
      if (reason instanceof CheckInDateChanged) {
        if (replacement !== undefined) {
          setOrphanedNote(habitNote)
          setEditingHabitId(null)
        }
        setReview(reason.message)
        return
      }
      if (date && isSaveOutcomeUnknown(reason)) {
        setUncertain({ kind: 'habit', date, id: habitId, done, note: replacement === undefined ? logs.get(habitId)?.note || null : replacement, editing: replacement !== undefined })
        return
      }
      if (reason instanceof ApiRequestError) {
        if (reason.status === 409 && reason.code === 'HABIT_ARCHIVED') {
          setEditingHabitId(null)
          restoreHeadingFocus.current = true
        }
        const fieldError = reason.fieldErrors.find((item) => item.field === 'note')?.message
        if (fieldError && replacement !== undefined) {
          setNoteError(fieldError)
          noteField.current?.focus()
          return
        }
      }
      setHabitMessage({ text: getUserFacingError(reason, 'Unable to update this habit.'), kind: 'error' })
    } finally {
      submitPending.current = false
      setSavingHabitId(null)
    }
  }
  if (isLoading) return <main className="page-container"><div className="card h-96 animate-pulse bg-surface-muted" aria-label={t("Loading the check-in for today")} /></main>
  if (error) return <main className="page-container"><div className="card p-8 text-center" role="alert"><h1 className="text-xl font-bold">{t("Today is not available yet")}</h1><p className="mt-2 text-sm text-foreground-muted">{t(error)}</p><RequestRetry retryAt={retryAt} onRetry={reload} /></div></main>
  return <main className="page-container pb-24 lg:pb-10"><div className="mx-auto max-w-3xl"><p className="eyebrow">{t("Daily check-in")}</p><h1 className="page-title mt-3">{t("How is your inner weather?")}</h1><p className="page-subtitle">{t("No right answer—just a small moment of honesty.")}</p>
    {review && <div role="status" className="mt-3 text-sm">
      <p>{t(review)}</p>
      {orphanedNote !== null && <div className="mt-2">
        <label className="field-label" htmlFor="unsaved-habit-note">{t('Unsaved habit note')}</label>
        <textarea id="unsaved-habit-note" readOnly className="field-input" value={orphanedNote} />
      </div>}
      {review === 'The server has different values. Review the saved data before saving again.' && <div className="mt-2">
        <p>{t('Saved mood')}: {mood?.score == null ? '—' : formatNumber(mood.score)} {mood?.tags?.map((tag) => t(tag)).join(', ')}</p>
        {mood?.note && <p className="whitespace-pre-wrap break-words">{mood.note}</p>}
      </div>}
    </div>}
    <section className="card mt-8 p-5 sm:p-8"><h2 className="text-lg font-bold">{t("Right now, I feel…")}</h2><div className="mt-5 grid grid-cols-5 gap-2 sm:gap-3">{moods.map((mood) => <button key={mood.score} type="button" disabled={pending} onClick={() => setScore(mood.score)} aria-pressed={score === mood.score} className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border text-3xl transition ${score === mood.score ? 'border-primary bg-primary-soft ring-3 ring-primary/10' : 'border-border bg-background hover:border-primary/50'}`}><span>{mood.emoji}</span><span className="mt-2 text-[0.65rem] font-bold sm:text-xs">{t(mood.label)}</span></button>)}</div><h2 className="mt-8 text-sm font-bold">{t("What is shaping this feeling?")}</h2><div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <button type="button" key={tag} disabled={pending} aria-pressed={selectedTags.includes(tag)} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} className={`rounded-full border px-3 py-2 text-xs font-semibold ${selectedTags.includes(tag) ? 'border-primary bg-primary-soft text-primary-dark' : 'border-border'}`}>{t(tag)}</button>)}</div><label className="field-label mt-8" htmlFor="reflection">{t("A note to yourself")} <span className="font-normal text-foreground-muted">{t("(optional)")}</span></label><textarea id="reflection" className="field-input min-h-28 resize-y" value={note} readOnly={pending} maxLength={500} placeholder={t("What would you like to remember about today?")} onChange={(event) => setNote(event.target.value)} /><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><MutationLiveRegion message={moodMessage} label={t('Check-in update')} /><button type="button" className="button-primary" disabled={pending} onClick={() => void save()}>{isSaving ? t('Saving…') : t("Save check-in")} <Icon name="check" className="size-4" /></button></div>{uncertain?.kind === 'mood' && <SaveRecovery check={checkSave} />}</section>
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">{t("Habits for today")}</h2>
        <span className="text-sm font-bold text-primary">{t('{done} of {total}', { done: formatNumber(completed), total: formatNumber(activeHabits.length) })}</span>
      </div>
      <div className="mt-3"><MutationLiveRegion message={habitMessage} label={t('Habit update')} /></div>
      {uncertain?.kind === 'habit' && !uncertain.editing && <SaveRecovery check={checkSave} />}
      <div className="mt-4 space-y-3">
        {habits.length === 0 && <div className="card p-6 text-center text-sm text-foreground-muted">{t("No active habits yet. Add one from the Habits page.")}</div>}
        {habits.map((habit) => {
          const log = logs.get(habit.id)
          const done = log?.done === true
          const editing = editingHabitId === habit.id
          const noteId = `habit-note-${habit.id}`
          return <article key={habit.id} className="card p-4">
            <button type="button" aria-pressed={done} disabled={pending}
              className="flex min-h-11 w-full items-center gap-4 rounded-control text-left disabled:opacity-70"
              onClick={() => void changeHabit(habit.id, !done)}>
              <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-surface-muted text-xl">{habitIcon(habit.icon)}</span>
              <span className={`flex-1 font-semibold ${done ? 'text-foreground-muted line-through' : ''}`}>{habit.name}</span>
              <span className={`grid size-7 place-items-center rounded-full ${done ? 'bg-success text-success-foreground' : 'border-2 border-border'}`} aria-hidden="true">
                {done && <Icon name="check" className="size-4" />}
              </span>
            </button>
            {habit.active === false && <p className="mt-2 text-xs text-foreground-muted">{t('Archived')}</p>}
            {log?.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{log.note}</p>}
            <button type="button" className="button-secondary mt-3"
              disabled={pending} aria-expanded={editing} aria-controls={editing ? noteId : undefined}
              onClick={(event) => {
                noteTrigger.current = event.currentTarget
                if (editing) closeNote()
                else {
                  setHabitNote(log?.note ?? '')
                  setNoteError(null)
                  setEditingHabitId(habit.id)
                }
              }}>{t(log?.note ? 'Edit habit note' : 'Add habit note')}</button>
            {editing && <form id={noteId} className="mt-3" onSubmit={(event) => {
              event.preventDefault()
              void changeHabit(habit.id, done, habitNote.trim() || null)
            }}>
              <label className="field-label" htmlFor={`${noteId}-text`}>{t('Habit note')}</label>
              <textarea ref={noteField} id={`${noteId}-text`} className="field-input min-h-20 resize-y"
                readOnly={pending} aria-invalid={Boolean(noteError)} aria-describedby={noteError ? `${noteId}-error` : undefined}
                value={habitNote} onChange={(event) => setHabitNote(event.target.value)} />
              {noteError && <p id={`${noteId}-error`} role="alert" className="text-sm text-danger">{t(noteError)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="button-primary" disabled={pending}>{savingHabitId === habit.id ? t('Saving…') : t('Save note')}</button>
                {log?.note && <button type="button" className="button-secondary" disabled={pending} onClick={() => void changeHabit(habit.id, done, null)}>{t('Remove note')}</button>}
                <button type="button" className="button-secondary" disabled={pending} onClick={closeNote}>{t('Cancel')}</button>
              </div>
              {uncertain?.kind === 'habit' && uncertain.id === habit.id && <SaveRecovery check={checkSave} />}
            </form>}
          </article>
        })}
      </div>
    </section>
  </div></main>
}
