import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { useT } from '@/i18n/useT'

/**
 * The FORGED component kit.
 *
 * Small, accessible, and dependency-free. Rules every control here follows:
 *  • Real semantic elements (button, input, label, dialog) — never a div with
 *    an onClick, because that breaks keyboards and screen readers.
 *  • Every interactive target clears 44px.
 *  • Labels are always associated; icon-only controls always carry aria-label.
 *
 * Text is almost always a prop, so the caller translates it and these
 * components pass it through untouched. Only the handful of strings this file
 * invents itself — the fallback labels below — are translated here.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-ember-500 to-ember-600 text-black font-semibold shadow-[0_6px_20px_-8px_rgba(249,115,22,0.9)] hover:from-ember-400 hover:to-ember-500 active:from-ember-600 active:to-ember-700',
  secondary: 'bg-steel text-parchment border border-edge hover:bg-slate active:bg-slate',
  ghost: 'bg-transparent text-ash hover:text-parchment hover:bg-steel/70',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold hover:from-gold-300 hover:to-gold-300',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-3.5 text-sm rounded-lg',
  md: 'h-12 px-4 text-[15px] rounded-xl',
  lg: 'h-14 px-5 text-base rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  full,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'touch-target inline-flex items-center justify-center gap-2 transition-colors duration-150 select-none',
        'disabled:opacity-45 disabled:pointer-events-none',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        full && 'w-full',
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'touch-target inline-flex items-center justify-center rounded-xl text-ash',
        'hover:text-parchment hover:bg-steel transition-colors disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  raised,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  raised?: boolean
  as?: 'div' | 'section' | 'article' | 'li'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag {...rest} className={cx(raised ? 'forge-panel-raised' : 'forge-panel', 'p-4', className)}>
      {children}
    </Tag>
  )
}

export function SectionHeading({
  title,
  action,
  hint,
  id,
}: {
  title: string
  action?: ReactNode
  hint?: string
  id?: string
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-2.5">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl text-parchment uppercase tracking-wide">
          {title}
        </h2>
        {hint && <p className="text-xs text-smoke mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-slate/70 my-4', className)} />
}

// ---------------------------------------------------------------------------
// Text + status
// ---------------------------------------------------------------------------

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'ember' | 'gold' | 'good' | 'caution' | 'danger' | 'cool'
  className?: string
}) {
  const tones = {
    neutral: 'bg-steel text-ash border-edge',
    ember: 'bg-ember-500/15 text-ember-200 border-ember-500/40',
    gold: 'bg-gold-500/15 text-gold-300 border-gold-500/40',
    good: 'bg-vital/12 text-vital border-vital/35',
    caution: 'bg-caution/12 text-caution border-caution/35',
    danger: 'bg-danger/12 text-danger border-danger/35',
    cool: 'bg-cool/12 text-cool border-cool/35',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warn' | 'danger' | 'good'
  title?: string
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-cool/35 bg-cool/8 text-cool',
    warn: 'border-caution/40 bg-caution/8 text-caution',
    danger: 'border-danger/45 bg-danger/10 text-danger',
    good: 'border-vital/40 bg-vital/8 text-vital',
  }
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'note'}
      className={cx('rounded-xl border px-3.5 py-3 text-sm', tones[tone], className)}
    >
      {title && <p className="font-semibold mb-1">{title}</p>}
      <div className="text-parchment/85 leading-relaxed">{children}</div>
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'ember' | 'gold' | 'good' | 'neutral'
  className?: string
}) {
  const valueTone = {
    ember: 'text-ember-400',
    gold: 'text-gold-300',
    good: 'text-vital',
    neutral: 'text-parchment',
  }[tone ?? 'neutral']
  return (
    <div className={cx('forge-panel p-3', className)}>
      <p className="text-[11px] uppercase tracking-wider text-smoke">{label}</p>
      <p className={cx('font-display text-2xl leading-tight mt-0.5 tabular', valueTone)}>{value}</p>
      {sub && <p className="text-xs text-ash mt-0.5 leading-snug">{sub}</p>}
    </div>
  )
}

export function ProgressBar({
  value,
  max = 1,
  tone = 'ember',
  label,
  ariaLabel,
  className,
  showValue,
}: {
  value: number
  max?: number
  tone?: 'ember' | 'gold' | 'good' | 'cool' | 'caution'
  /** Rendered above the bar AND used as the accessible name. */
  label?: string
  /** Accessible name only — for bars that already have a visible heading. */
  ariaLabel?: string
  className?: string
  showValue?: boolean
}) {
  const { t } = useT()
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const tones = {
    ember: 'from-ember-600 to-ember-400',
    gold: 'from-gold-700 to-gold-300',
    good: 'from-vital/70 to-vital',
    cool: 'from-cool/60 to-cool',
    caution: 'from-caution/60 to-caution',
  }
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-ash mb-1">
          {label && <span>{label}</span>}
          {showValue && (
            <span className="tabular">
              {Math.round(value)}/{Math.round(max)}
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 rounded-full bg-steel overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label ?? t('Progress')}
      >
        <div
          className={cx('h-full rounded-full bg-gradient-to-r transition-[width] duration-500', tones[tone])}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({
  icon = '◇',
  title,
  body,
  action,
}: {
  icon?: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="forge-panel px-5 py-8 text-center">
      <div aria-hidden className="text-3xl text-smoke mb-2">
        {icon}
      </div>
      <h3 className="font-display text-lg uppercase tracking-wide text-parchment">{title}</h3>
      <p className="text-sm text-ash mt-1.5 mx-auto max-w-xs leading-relaxed">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

// The default is resolved in the body rather than in the signature, because
// `t` is a hook result and a default parameter cannot call one.
export function Spinner({ label }: { label?: string }) {
  const { t } = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <span
        aria-hidden
        className="size-8 rounded-full border-2 border-ember-500/30 border-t-ember-500 animate-spin"
      />
      <span className="text-sm text-ash">{label ?? t('Loading')}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
  required,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
  required?: boolean
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-parchment">
        {label}
        {required && <span className="text-ember-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-smoke leading-snug">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger leading-snug">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'w-full h-12 rounded-xl bg-coal border border-slate px-3.5 text-parchment placeholder:text-smoke ' +
  'focus:border-ember-500 focus:ring-0 transition-colors'

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputClass, className)} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...rest}
      className={cx(inputClass, 'h-auto py-3 leading-relaxed resize-y min-h-24', className)}
    />
  )
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
  label,
  decimals = 0,
  className,
}: {
  value: number
  onChange: (next: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  label: string
  decimals?: number
  className?: string
}) {
  const id = useId()
  const clamp = (n: number) => Math.max(min, Math.min(max, Number(n.toFixed(decimals + 2))))

  /*
    What you are typing, while you are typing it.

    The field used to clamp on every keystroke. Reaching for 70 with a
    minimum of 30, the "7" became 30 before the 0 arrived, and the next
    keystroke landed on the end of THAT — so the only way to enter a number
    was to paste one. Clearing the field was worse: an empty input parses to
    0, which is finite, so it clamped straight to the minimum and you could
    never start again.

    So a draft string is held while the field has focus and the value is only
    clamped when editing finishes. Half-typed input is passed up when it
    happens to be in range, so live previews still track, and left alone when
    it is not, because "30" is not a helpful reading of somebody who has so
    far typed "7".
  */
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const parsed = Number(draft)
    // An empty or nonsense field reverts to what was there before rather
    // than snapping to a boundary the user never chose.
    onChange(draft.trim() === '' || !Number.isFinite(parsed) ? clamp(value) : clamp(parsed))
    setDraft(null)
  }

  // The two stepper aria-labels stay English on purpose: the browser suite
  // selects on them (`getByLabel('Increase Reps')`), so they are test API as
  // much as they are accessible names.
  return (
    <div className={cx('flex items-stretch gap-1', className)}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => {
          setDraft(null)
          onChange(clamp(value - step))
        }}
        className="touch-target w-12 shrink-0 rounded-l-xl bg-steel border border-slate border-r-0 text-xl text-ash active:bg-slate disabled:opacity-40"
        disabled={value <= min}
      >
        −
      </button>
      {/* min-w keeps a tappable, typeable field even in a cramped column. */}
      <div className="relative flex-1 min-w-[2.5rem]">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={draft ?? (Number.isFinite(value) ? String(Number(value.toFixed(decimals))) : '')}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const text = e.target.value
            setDraft(text)
            const next = Number(text)
            if (text.trim() !== '' && Number.isFinite(next) && next >= min && next <= max) {
              onChange(clamp(next))
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit()
              e.currentTarget.blur()
            }
          }}
          className="w-full h-12 bg-coal border-y border-slate text-center text-lg font-semibold tabular text-parchment focus:border-ember-500"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-smoke">
            {suffix}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => {
          setDraft(null)
          onChange(clamp(value + step))
        }}
        className="touch-target w-12 shrink-0 rounded-r-xl bg-steel border border-slate border-l-0 text-xl text-ash active:bg-slate disabled:opacity-40"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  columns,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (next: T) => void
  label: string
  className?: string
  columns?: number
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('grid gap-1.5', className)}
      style={{ gridTemplateColumns: `repeat(${columns ?? Math.min(options.length, 3)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'touch-target rounded-xl border px-2 py-2 text-sm transition-colors text-center leading-tight',
              active
                ? 'border-ember-500 bg-ember-500/15 text-ember-200 font-semibold'
                : 'border-slate bg-coal text-ash hover:border-edge',
            )}
          >
            <span className="block">{option.label}</span>
            {option.hint && <span className="block text-[10px] text-smoke mt-0.5">{option.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  label,
  multi,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T[] | T
  onChange: (next: never) => void
  label: string
  multi?: boolean
}) {
  const selected = Array.isArray(value) ? value : [value]
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className="space-y-2">
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => {
              if (multi) {
                const next = active
                  ? (selected as T[]).filter((v) => v !== option.value)
                  : [...(selected as T[]), option.value]
                onChange(next as never)
              } else {
                onChange(option.value as never)
              }
            }}
            className={cx(
              'w-full text-left rounded-xl border px-4 py-3 transition-colors touch-target flex items-start gap-3',
              active ? 'border-ember-500 bg-ember-500/12' : 'border-slate bg-coal hover:border-edge',
            )}
          >
            <span
              aria-hidden
              className={cx(
                'mt-0.5 shrink-0 size-5 border flex items-center justify-center text-[11px]',
                multi ? 'rounded-md' : 'rounded-full',
                active ? 'border-ember-500 bg-ember-500 text-black' : 'border-edge text-transparent',
              )}
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className={cx('block text-sm', active ? 'text-parchment font-medium' : 'text-parchment/90')}>
                {option.label}
              </span>
              {option.hint && <span className="block text-xs text-smoke mt-0.5 leading-snug">{option.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 touch-target text-left py-1"
    >
      <span className="min-w-0">
        <span className="block text-sm text-parchment">{label}</span>
        {hint && <span className="block text-xs text-smoke leading-snug mt-0.5">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          'relative shrink-0 w-12 h-7 rounded-full transition-colors',
          checked ? 'bg-ember-500' : 'bg-slate',
        )}
      >
        <span
          className={cx(
            'absolute top-1 size-5 rounded-full bg-parchment transition-[left] duration-200',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  labels,
  tone = 'ember',
}: {
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step?: number
  label: string
  labels?: [string, string]
  tone?: 'ember' | 'caution' | 'good'
}) {
  const id = useId()
  const accent = { ember: 'accent-ember-500', caution: 'accent-caution', good: 'accent-vital' }[tone]
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm text-parchment">
          {label}
        </label>
        <span className="font-display text-lg text-ember-400 tabular">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cx('w-full h-11 bg-transparent cursor-pointer', accent)}
      />
      {labels && (
        <div className="flex justify-between text-[11px] text-smoke -mt-1">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  labelledBy?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const headingId = useId()

  /**
   * The close handler is held in a ref so the effect below can depend on `open`
   * ALONE.
   *
   * Every caller passes an inline arrow, so `onClose` has a new identity on
   * every parent render. With it in the dependency array, typing one character
   * into a field inside a sheet re-ran this whole effect — which pulled focus
   * out of that field ~30 ms later. On iOS that closes the keyboard mid-word,
   * making every search box inside a sheet impossible to type in.
   */
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement as HTMLElement | null
    // Move focus into the sheet so keyboard and screen-reader users land inside,
    // but never steal it back from a field the user has since tapped into.
    const timer = window.setTimeout(() => {
      const node = ref.current
      if (node && !node.contains(document.activeElement)) node.focus()
    }, 30)
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  // Both "Close" labels below stay English: the browser suite dismisses sheets
  // with `getByRole('button', { name: 'Close' })`. The visible control is the
  // ✕ glyph either way.
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? headingId}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl border-t border-x border-edge bg-iron animate-rise focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-slate/80">
          <div aria-hidden className="absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 rounded-full bg-slate" />
          <h2 id={headingId} className="font-display text-lg uppercase tracking-wide pt-1">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2">
            <span aria-hidden className="text-xl">
              ✕
            </span>
          </IconButton>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 flex-1">{children}</div>
        {footer && (
          <div
            className="px-4 py-3 border-t border-slate/80 bg-iron"
            style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useT()
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-ash leading-relaxed">{body}</p>
      <div className="mt-5 flex gap-2">
        <Button full onClick={onCancel}>
          {cancelLabel ?? t('Cancel')}
        </Button>
        <Button full variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel ?? t('Confirm')}
        </Button>
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Disclosure
// ---------------------------------------------------------------------------

export function Disclosure({
  summary,
  children,
  defaultOpen,
  tone,
}: {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  tone?: 'default' | 'quiet'
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div className={cx('rounded-xl border', tone === 'quiet' ? 'border-slate/60' : 'border-slate')}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left touch-target"
      >
        <span className="min-w-0 text-sm text-parchment">{summary}</span>
        <span aria-hidden className={cx('text-ash transition-transform shrink-0', open && 'rotate-180')}>
          ▾
        </span>
      </button>
      {open && <div className="px-3.5 pb-3.5 pt-0 text-sm text-ash leading-relaxed">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reduced motion context (mirrors the in-app setting + OS preference)
// ---------------------------------------------------------------------------

const MotionContext = createContext(false)

export function MotionProvider({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const value = reduced || systemReduced
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', value)
  }, [value])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useReducedMotion(): boolean {
  return useContext(MotionContext)
}
