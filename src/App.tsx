import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { BottomNav, ToastHost } from '@/components/AppShell'
import { MotionProvider, Spinner } from '@/components/ui'
import { useStore } from '@/state/store'

// Eager: the screens on the critical path from cold start.
import Onboarding from '@/screens/Onboarding'
import Today from '@/screens/Today'
import Train from '@/screens/Train'
import SessionPlayer from '@/screens/SessionPlayer'
import Progress from '@/screens/Progress'

// Lazy: everything reachable in a second tap. Keeps the first paint small
// without hurting offline use — the service worker precaches every chunk.
const SessionSummary = lazy(() => import('@/screens/SessionSummary'))
const ProgramEditor = lazy(() => import('@/screens/ProgramEditor'))
const ExerciseHistory = lazy(() => import('@/screens/ExerciseHistory'))
const RunLogger = lazy(() => import('@/screens/RunLogger'))
const VolumeDashboard = lazy(() => import('@/screens/VolumeDashboard'))
const Nutrition = lazy(() => import('@/screens/Nutrition'))
const Checkin = lazy(() => import('@/screens/Checkin'))
const RecommendationDetail = lazy(() => import('@/screens/RecommendationDetail'))
const Forge = lazy(() => import('@/screens/Forge'))
const PackOpening = lazy(() => import('@/screens/PackOpening'))
const Inventory = lazy(() => import('@/screens/Inventory'))
const CharacterCustomize = lazy(() => import('@/screens/CharacterCustomize'))
const Sparring = lazy(() => import('@/screens/Sparring'))
const Quests = lazy(() => import('@/screens/Quests'))
const Profile = lazy(() => import('@/screens/Profile'))
const Science = lazy(() => import('@/screens/Science'))
const Backup = lazy(() => import('@/screens/Backup'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { data, ready } = useStore()
  const location = useLocation()
  const onboarded = Boolean(data.profile?.onboardedAt)
  // Two routes are deliberately full-screen: logging a workout, and the
  // pack-opening moment. Chrome would only get in the way of both.
  const immersive =
    location.pathname.startsWith('/train/session/') || location.pathname.startsWith('/forge/pack/')

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center bg-void">
        <div className="text-center">
          <p className="font-display text-4xl tracking-[0.3em] text-ember-500">FORGED</p>
          <Spinner label="Opening the forge" />
        </div>
      </div>
    )
  }

  return (
    <MotionProvider reduced={data.settings.reducedMotion}>
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-ember-500 focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>
      <div id="main-content">
        {!onboarded ? (
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        ) : (
          <>
            <Suspense fallback={<Spinner label="Loading" />}>
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/onboarding" element={<Navigate to="/" replace />} />

                <Route path="/train" element={<Train />} />
                <Route path="/train/session/:sessionId" element={<SessionPlayer />} />
                <Route path="/train/summary/:sessionId" element={<SessionSummary />} />
                <Route path="/train/program/:programId" element={<ProgramEditor />} />
                <Route path="/train/exercise/:exerciseId" element={<ExerciseHistory />} />
                <Route path="/train/run" element={<RunLogger />} />

                <Route path="/progress" element={<Progress />} />
                <Route path="/progress/volume" element={<VolumeDashboard />} />
                <Route path="/nutrition" element={<Nutrition />} />
                {/* The nutrition screen used to live under Progress. Anything
                    bookmarked or linked there still lands in the right place. */}
                <Route path="/progress/protein" element={<Navigate to="/nutrition" replace />} />
                <Route path="/progress/checkin" element={<Checkin />} />
                <Route path="/progress/recommendation/:exerciseId" element={<RecommendationDetail />} />

                <Route path="/forge" element={<Forge />} />
                <Route path="/forge/pack/:packId" element={<PackOpening />} />
                <Route path="/forge/inventory" element={<Inventory />} />
                <Route path="/forge/sparring" element={<Sparring />} />
                <Route path="/forge/character" element={<CharacterCustomize />} />
                <Route path="/forge/quests" element={<Quests />} />

                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/science" element={<Science />} />
                <Route path="/profile/backup" element={<Backup />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            {/* The nav is hidden inside the workout player so logging stays uncluttered. */}
            {!immersive && <BottomNav />}
          </>
        )}
      </div>
      <ToastHost />
    </MotionProvider>
  )
}
