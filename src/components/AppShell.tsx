import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, type ReactNode } from 'react'
import { useStore } from '@/state/store'
import { resolveToday } from '@/engine/schedule'
import { cx, IconButton } from '@/components/ui'

/**
 * App shell: header, scrolling content region, and the bottom navigation.
 *
 * The centre tab is Train and it is raised — from anywhere in the app, one
 * thumb-reachable tap starts (or resumes) today's session.
 */

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 'currentColor' : 'currentColor'
  const common = { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'today':
      return (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden {...{}}>
          <rect x="3" y="5" width="18" height="16" rx="3" {...common} />
          <path d="M3 10h18M8 3v4M16 3v4" {...common} />
          <circle cx="12" cy="15.5" r="1.8" fill={active ? 'currentColor' : 'none'} stroke={stroke} strokeWidth="1.6" />
        </svg>
      )
    case 'progress':
      return (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <path d="M4 19V5M4 19h16" {...common} />
          <path d="M8 16v-4M12 16V8M16 16v-6" {...common} strokeWidth="2.4" />
        </svg>
      )
    case 'train':
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10" {...common} strokeWidth="2.2" />
        </svg>
      )
    case 'forge':
      return (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <path d="M12 3c1.6 3 4.5 4.2 4.5 8a4.5 4.5 0 0 1-9 0c0-1.6.8-2.6 1.6-3.6" {...common} />
          <path d="M12 21a3 3 0 0 0 3-3c0-2-3-3.5-3-6-1.5 2-3 3.4-3 6a3 3 0 0 0 3 3Z" {...common} />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
          <circle cx="12" cy="8" r="3.6" {...common} />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...common} />
        </svg>
      )
  }
}

const TABS = [
  { to: '/', label: 'Today', icon: 'today', end: true },
  { to: '/progress', label: 'Progress', icon: 'progress', end: false },
  { to: '__center__', label: 'Train', icon: 'train', end: false },
  { to: '/forge', label: 'Forge', icon: 'forge', end: false },
  { to: '/profile', label: 'Profile', icon: 'profile', end: false },
]

export function BottomNav() {
  const { data } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const plan = useMemo(() => resolveToday({ data }), [data])
  const trainActive = location.pathname.startsWith('/train')

  const onCenter = () => {
    if (plan.kind === 'resume' && plan.activeSessionId) {
      navigate(`/train/session/${plan.activeSessionId}`)
    } else {
      navigate('/train')
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 bg-coal/95 backdrop-blur border-t border-slate safe-x"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="grid grid-cols-5 max-w-lg mx-auto">
        {TABS.map((tab) => {
          if (tab.to === '__center__') {
            return (
              <li key="center" className="relative flex justify-center">
                <button
                  type="button"
                  onClick={onCenter}
                  aria-current={trainActive ? 'page' : undefined}
                  className={cx(
                    'touch-target -mt-5 size-15 w-15 rounded-2xl flex flex-col items-center justify-center gap-0.5',
                    'bg-gradient-to-b from-ember-500 to-ember-600 text-black shadow-[0_10px_28px_-10px_rgba(249,115,22,0.9)]',
                    'active:from-ember-600 active:to-ember-700',
                  )}
                  style={{ width: '3.75rem', height: '3.75rem' }}
                >
                  <NavIcon name="train" active />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    {plan.kind === 'resume' ? 'Resume' : 'Train'}
                  </span>
                </button>
              </li>
            )
          }
          return (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cx(
                    'touch-target w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                    isActive ? 'text-ember-400' : 'text-smoke hover:text-ash',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <NavIcon name={tab.icon} active={isActive} />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function Screen({
  title,
  subtitle,
  children,
  action,
  back,
  wide,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  back?: string | (() => void)
  wide?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="sticky top-0 z-30 bg-void/92 backdrop-blur border-b border-slate/70 safe-x"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className={cx('mx-auto flex items-center gap-2 px-4 py-3', wide ? 'max-w-3xl' : 'max-w-lg')}>
          {back && (
            <IconButton
              label="Go back"
              className="-ml-2 shrink-0"
              onClick={() => (typeof back === 'string' ? navigate(back) : back())}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl uppercase tracking-wide leading-none truncate">{title}</h1>
            {subtitle && <p className="text-xs text-smoke mt-1 truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main
        className={cx('flex-1 mx-auto w-full px-4 pt-4 safe-x', wide ? 'max-w-3xl' : 'max-w-lg')}
        style={{ paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 1.5rem)' }}
      >
        {children}
      </main>
    </div>
  )
}

export function ToastHost() {
  const { toasts, dismissToast } = useStore()
  if (!toasts.length) return null
  const tones = {
    reward: 'border-ember-500/60 bg-ember-500/12 text-ember-200',
    info: 'border-cool/40 bg-cool/10 text-cool',
    warn: 'border-caution/50 bg-caution/10 text-caution',
    error: 'border-danger/50 bg-danger/10 text-danger',
  }
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(28rem,calc(100%-2rem))] space-y-2"
      style={{ bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 1rem)' }}
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={cx(
            'w-full text-left rounded-xl border backdrop-blur px-4 py-3 animate-rise bg-iron/95 shadow-lg',
            tones[toast.tone],
          )}
        >
          <p className="font-semibold text-sm flex items-center gap-2">
            {toast.icon && <span aria-hidden>{toast.icon}</span>}
            {toast.title}
          </p>
          {toast.body && <p className="text-xs text-parchment/80 mt-0.5 leading-snug">{toast.body}</p>}
        </button>
      ))}
    </div>
  )
}
