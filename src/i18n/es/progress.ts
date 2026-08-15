import type { Dict } from '@/i18n'

/** Spanish for the progress surface. Keys are the exact English source strings. */
export const PROGRESS: Dict = {
  // --- Progress ------------------------------------------------------------
  'Fatigue check': 'Revisión de fatiga',
  'What a deload looks like': 'Cómo es una descarga',
  'Not now': 'Ahora no',
  'Start deload': 'Empezar descarga',
  'Mark deload complete': 'Marcar descarga como terminada',
  'Consistency': 'Constancia',
  'Sets this week': 'Series esta semana',
  'Protein adherence': 'Cumplimiento de proteína',
  '7-day weight': 'Peso a 7 días',
  'Lifted': 'Pesas',
  'Ran': 'Carrera',
  'Deload': 'Descarga',
  'Rest logged': 'Descanso registrado',
  'Weekly hard sets': 'Series duras semanales',
  'Details': 'Detalles',
  'All muscles and contributing exercises →': 'Todos los músculos y los ejercicios que aportan →',
  'Where you stand': 'Dónde estás',
  'th': 'º',
  'What this number is, and what it is not': 'Qué es este número y qué no es',
  'Body weight is handled allometrically — strength scales with roughly the two-thirds power of body mass, so a heavier lifter needs more weight on the bar but a smaller multiple of themselves for the same standing. One exponent, applied identically to everyone.':
    'El peso corporal se trata de forma alométrica: la fuerza escala aproximadamente con la potencia dos tercios de la masa corporal, así que alguien más pesado necesita más peso en la barra pero un múltiplo menor de sí mismo para el mismo puesto. Un exponente, aplicado igual para todos.',
  'crossing': 'cruzar',
  'Strength trend': 'Tendencia de fuerza',
  'Log a movement at least twice and its estimated strength trend appears here.':
    'Registra un movimiento al menos dos veces y aquí aparecerá su tendencia estimada de fuerza.',
  'Rep quality this week': 'Calidad de las repeticiones esta semana',
  'Rated sets': 'Series valoradas',
  'Average RIR': 'RIR medio',
  'To failure': 'Al fallo',
  'No working sets logged this week yet.':
    'Todavía no hay series de trabajo registradas esta semana.',
  'Log weight': 'Registrar peso',
  'Solid = daily entries, dashed = 7-day rolling average. Day-to-day swings are mostly water and food in transit — read the average.':
    'Línea continua = registros diarios; discontinua = media móvil de 7 días. Los vaivenes de un día a otro son sobre todo agua y comida en tránsito: fíjate en la media.',
  'Log your weight a few times to see a trend.':
    'Registra tu peso unas cuantas veces para ver una tendencia.',
  'Add measurements': 'Añadir medidas',
  'Add a progress photo': 'Añadir una foto de progreso',
  'Add photo': 'Añadir foto',
  'Remove': 'Quitar',
  'Recovery': 'Recuperación',
  'No check-ins yet. They take 15 seconds and they are what makes deload detection meaningful.':
    'Todavía no hay registros diarios. Tardan 15 segundos y son lo que hace que la detección de descargas tenga sentido.',
  'Deload history': 'Historial de descargas',
  'Log body weight': 'Registrar peso corporal',
  'Measurements': 'Medidas',
  'All measurements in centimetres. Leave anything blank that you did not measure.':
    'Todas las medidas en centímetros. Deja en blanco lo que no hayas medido.',
  'Save measurements': 'Guardar medidas',

  // --- Recommendation detail, volume, history and charts -------------------
  'Recommendation': 'Recomendación',
  'Nothing to explain yet': 'Todavía no hay nada que explicar',
  'Why this?': '¿Por qué esto?',
  'Recommended action': 'Acción recomendada',
  'Exact next-session target': 'Objetivo exacto para la próxima sesión',
  'Plain-language reason': 'Razón en lenguaje claro',
  'Confidence': 'Confianza',
  'Missing or uncertain': 'Ausente o incierto',
  'Nothing important is missing for this recommendation.':
    'No falta nada importante para esta recomendación.',
  'What the engine looked at': 'Qué miró el motor',
  'Stalled': 'Estancado',
  'Run load': 'Carga de carrera',
  'No comparable sessions yet.': 'Todavía no hay sesiones comparables.',
  'FORGED cannot measure how much muscle you have gained, and it does not pretend to. It optimises what it can see: load, reps, effort, pain, consistency and recovery inputs. Everything above is deterministic — no language model made this decision, and the same inputs will always produce the same output.':
    'FORGED no puede medir cuánto músculo has ganado, y no pretende hacerlo. Optimiza lo que sí ve: carga, repeticiones, esfuerzo, dolor, constancia y datos de recuperación. Todo lo de arriba es determinista: ningún modelo de lenguaje tomó esta decisión, y las mismas entradas siempre darán el mismo resultado.',
  'Read the Science & Safety centre →': 'Leer el centro de Ciencia y seguridad →',
  'Muscle volume': 'Volumen por músculo',
  'Week': 'Semana',
  'Hard sets': 'Series duras',
  'Completed': 'Completadas',
  'How to read this': 'Cómo leer esto',
  'Total hard sets by week': 'Series duras totales por semana',
  'Hypertrophy check': 'Revisión de hipertrofia',
  'Room to add a little': 'Margen para añadir un poco',
  'By muscle': 'Por músculo',
  'No completed sets in this week. Volume appears as soon as you finish a session.':
    'No hay series completadas esta semana. El volumen aparece en cuanto termines una sesión.',
  'Each exercise declares a fractional contribution to each muscle in one central data file. A set of barbell rows counts 1.0 toward the upper back and lats and 0.5 toward biceps and rear delts. Those fractions are summed across every completed hard set in the week. Nothing is inferred or hidden — you can see and edit them on any custom exercise.':
    'Cada ejercicio declara una contribución fraccionada a cada músculo en un único archivo de datos central. Una serie de remo con barra cuenta 1,0 para la espalda alta y los dorsales y 0,5 para los bíceps y los deltoides posteriores. Esas fracciones se suman en todas las series duras completadas de la semana. No se infiere ni se oculta nada: puedes verlas y editarlas en cualquier ejercicio propio.',
  'No completed sets contributed to this muscle in this week.':
    'Ninguna serie completada aportó a este músculo esta semana.',
  'Exercise': 'Ejercicio',
  'Not found': 'No encontrado',
  'This exercise is not in your library.': 'Este ejercicio no está en tu biblioteca.',
  'These are the exact numbers the weekly volume dashboard adds up. A 1.0 counts as a full hard set for that muscle; a 0.5 counts as half.':
    'Estos son exactamente los números que suma el panel de volumen semanal. Un 1,0 cuenta como una serie dura completa para ese músculo; un 0,5 cuenta como media.',
  'Top set': 'Mejor serie',
  'Est. 1RM': '1RM est.',
  'Estimated 1RM trend': 'Tendencia del 1RM estimado',
  'Every logged session': 'Todas las sesiones registradas',
  'No history yet': 'Todavía no hay historial',
  'Log this movement once and FORGED will start producing specific, explained targets for it.':
    'Registra este movimiento una vez y FORGED empezará a darte objetivos concretos y explicados para él.',
  'Next session target': 'Objetivo de la próxima sesión',
  'Safety': 'Seguridad',
  'Rule used': 'Regla aplicada',
  'Evidence': 'Evidencia',
  'What FORGED is missing': 'Qué le falta a FORGED',
  'Full reasoning': 'Razonamiento completo',
  'Not enough data yet.': 'Todavía no hay datos suficientes.',
  'No data yet.': 'Todavía no hay datos.',
  'sets': 'series',

  // --- Recommendation rule box ---------------------------------------------
  'Every threshold lives in one documented config file.':
    'Todos los umbrales viven en un único archivo de configuración documentado.',
  'RIR window:': 'Ventana de RIR:',
  'Pain block:': 'Bloqueo por dolor:',
  'Stall after:': 'Estancado tras:',
  '{n} sessions': '{n} sesiones',
  'Back-off:': 'Retroceso:',
}
