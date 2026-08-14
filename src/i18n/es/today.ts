import type { Dict } from '@/i18n'

/** Spanish for the today surface. Keys are the exact English source strings. */
export const TODAY: Dict = {
  // -------------------------------------------------------------------------
  // Today — greeting
  // -------------------------------------------------------------------------
  'Late night, {name}': 'De madrugada, {name}',
  'Morning, {name}': 'Buenos días, {name}',
  'Afternoon, {name}': 'Buenas tardes, {name}',
  'Evening, {name}': 'Buenas noches, {name}',

  // -------------------------------------------------------------------------
  // Today — the one thing to do
  // -------------------------------------------------------------------------
  'Prescribed recovery': 'Recuperación prescrita',
  'Today’s run': 'La carrera de hoy',
  'Today’s session': 'La sesión de hoy',
  'Moved from {date} — nothing was stacked on top of another day.':
    'Movido desde {date} — no se acumuló nada encima de otro día.',
  'Why this, today?': '¿Por qué esto, hoy?',
  'Resume session': 'Reanudar sesión',
  'Log this run': 'Registrar esta carrera',
  'Log recovery check-in': 'Registrar chequeo de recuperación',
  'Build my plan': 'Crear mi plan',
  'Start session': 'Empezar sesión',
  'Earns up to {xp} XP and {coins} coins for a completed run':
    'Ganas hasta {xp} XP y {coins} monedas por una carrera completada',
  'Earns up to {xp} XP and {coins} coins for a completed session':
    'Ganas hasta {xp} XP y {coins} monedas por una sesión completada',

  // -------------------------------------------------------------------------
  // Today — deload prompt
  // -------------------------------------------------------------------------
  'Deload worth considering': 'Conviene considerar una descarga',
  'Review the signals →': 'Ver las señales →',

  // -------------------------------------------------------------------------
  // Today — readiness and nutrition cards
  // -------------------------------------------------------------------------
  Readiness: 'Disposición',
  'Sleep {hours}h · soreness {soreness}/5': 'Sueño {hours}h · dolor {soreness}/5',
  'Not logged': 'Sin registrar',
  'Takes 15 seconds →': 'Toma 15 segundos →',
  'Calories left': 'Calorías restantes',
  Protein: 'Proteína',
  'Calories eaten today': 'Calorías consumidas hoy',
  'Protein eaten today': 'Proteína consumida hoy',
  '{eaten}/{target} g protein': '{eaten}/{target} g de proteína',
  '{grams} g to go': 'faltan {grams} g',

  // -------------------------------------------------------------------------
  // Today — character and rewards
  // -------------------------------------------------------------------------
  'Customise your warrior': 'Personaliza a tu guerrero',
  'Level {level}': 'Nivel {level}',
  '{days}-day streak': 'racha de {days} días',
  '{percent}% consistency': '{percent}% de constancia',
  '{count} unopened pack': '{count} sobre sin abrir',
  '{count} unopened packs': '{count} sobres sin abrir',

  // -------------------------------------------------------------------------
  // Today — quests
  // -------------------------------------------------------------------------
  'Daily quest': 'Misión diaria',
  'Weekly quest': 'Misión semanal',
  'Claim →': 'Reclamar →',

  // -------------------------------------------------------------------------
  // Today — the week ahead
  // -------------------------------------------------------------------------
  'The week ahead': 'La semana que viene',
  'Missed days are rescheduled, not punished.': 'Los días perdidos se reprograman, no se castigan.',
  'Last 28 days': 'Últimos 28 días',

  // -------------------------------------------------------------------------
  // Today — running
  // -------------------------------------------------------------------------
  Running: 'Carrera',
  'Log a run': 'Registrar carrera',
  // Run kinds, as stored. Feminine because they describe "una carrera".
  easy: 'suave',
  long: 'larga',
  intervals: 'intervalos',
  threshold: 'umbral',
  recovery: 'recuperación',
  benchmark: 'referencia',
  'walk/run': 'caminar/correr',

  // -------------------------------------------------------------------------
  // Today — recent activity
  // -------------------------------------------------------------------------
  Recent: 'Reciente',
  '{count} working sets': '{count} series efectivas',
  '{type} run': 'carrera {type}',
  'Nothing logged yet. Your first completed session unlocks the recommendation engine.':
    'Aún no hay nada registrado. Tu primera sesión completada activa el motor de recomendaciones.',

  // -------------------------------------------------------------------------
  // Check-in
  // -------------------------------------------------------------------------
  'Check in': 'Chequeo',
  'You already checked in today. Saving again replaces that entry.':
    'Ya hiciste el chequeo hoy. Guardar otra vez reemplaza esa entrada.',

  Sleep: 'Sueño',
  'Hours slept': 'Horas dormidas',
  hrs: 'h',
  'Sleep quality (1–5)': 'Calidad del sueño (1–5)',
  Terrible: 'Pésima',
  Excellent: 'Excelente',

  Body: 'Cuerpo',
  'Muscle soreness (1–5)': 'Dolor muscular (1–5)',
  None: 'Nada',
  'Very sore': 'Muy adolorido',
  'Joint discomfort (0–10)': 'Molestia articular (0–10)',
  Severe: 'Severa',

  'How ready do you feel to train? (1–5)': '¿Qué tan listo te sientes para entrenar? (1–5)',
  Wrecked: 'Destrozado',
  Primed: 'A tope',
  'Life stress (1–5)': 'Estrés en tu vida (1–5)',
  Calm: 'Tranquilo',
  Overloaded: 'Saturado',

  Notes: 'Notas',
  'Anything worth remembering about today': 'Algo que valga la pena recordar de hoy',

  // The flag clauses are joined by the app, so each one is its own key and so
  // is the conjunction.
  'Worth noting': 'Para tener en cuenta',
  'soreness is elevated': 'el dolor muscular está alto',
  'readiness is low': 'tu disposición está baja',
  'joint discomfort is notable': 'la molestia articular es notable',
  and: 'y',
  'Today {flags}. That does not automatically mean skip training — but if this pattern repeats, FORGED will suggest a deload rather than pushing load onto accumulated fatigue.':
    'Hoy {flags}. Eso no significa que debas saltarte el entrenamiento — pero si el patrón se repite, FORGED sugerirá una descarga en vez de sumar carga sobre la fatiga acumulada.',

  'Stop and get this looked at': 'Detente y haz que te revisen esto',
  'Joint pain at {pain}/10 is not something to train through. See a physiotherapist or physician. If you have chest pain, dizziness, fainting or unusual breathlessness, stop exercising and seek urgent medical attention.':
    'Un dolor articular de {pain}/10 no es algo con lo que se deba entrenar. Consulta a un fisioterapeuta o a un médico. Si tienes dolor en el pecho, mareos, desmayos o falta de aire inusual, deja de hacer ejercicio y busca atención médica urgente.',

  'Save check-in': 'Guardar chequeo',
  'Check-ins are what let FORGED tell the difference between “you need to push harder” and “you need a lighter week”. Rest days you log this way count toward your consistency.':
    'Los chequeos son lo que le permite a FORGED distinguir entre “necesitas apretar más” y “necesitas una semana más ligera”. Los días de descanso que registras así cuentan para tu constancia.',
}
