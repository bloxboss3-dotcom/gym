import type { Dict } from '@/i18n'

/**
 * Spanish for the prose the engines produce.
 *
 * These sentences are the app. Everything else is chrome around them — the
 * recommendation, the reason it fired, the coaching verdict, the refusal to
 * offer a finisher and why. A Spanish speaker reading translated buttons and
 * English coaching has been given the packaging and not the thing.
 *
 * The engines stay pure and English. The screen translates their output at the
 * point it renders it, which works because the English string IS the lookup
 * key. Sentences with numbers in them arrive as `{placeholder}` templates from
 * the engine for the same reason: a finished sentence has nothing left to look
 * up, and word order differs between languages.
 */
export const ENGINE: Dict = {
  // --- What to do next, on one movement ------------------------------------
  'Find a working weight': 'Encuentra un peso de trabajo',
  'Stop this movement and get it looked at': 'Detén este ejercicio y hazlo revisar',
  'Keep the same weight — earn it with reps in the tank':
    'Mantén el mismo peso — gánatelo dejando repeticiones en reserva',
  'Change the movement or the rep target': 'Cambia el ejercicio o el rango de repeticiones',
  'Hold the load and look at recovery': 'Mantén la carga y revisa tu recuperación',
  'Swap this movement out': 'Cambia este ejercicio por otro',
  'Hold the load and clean it up': 'Mantén la carga y limpia la técnica',

  // --- Why a finisher is not on offer --------------------------------------
  'Intensity techniques are offered when the goal is muscle growth. Yours is set to something else.':
    'Las técnicas de intensidad se ofrecen cuando el objetivo es ganar músculo. El tuyo está puesto en otra cosa.',
  'You are in a deload. Cutting work on purpose and then adding a finisher cancels the point of it.':
    'Estás en semana de descarga. Bajar el trabajo a propósito y luego añadir un remate anula el sentido de hacerlo.',
  'Not on this movement. Going past failure with a loaded spine, or under a barbell you have to escape from, is not worth any amount of extra growth.':
    'En este ejercicio no. Pasar del fallo con la columna cargada, o debajo de una barra de la que tienes que salir, no compensa por mucho músculo que prometa.',
  'This movement already has a finisher today.': 'Este ejercicio ya tiene un remate hoy.',
  // These two carry numbers that come from the rules config, so the English
  // key changes if the config does. That is deliberate: the coverage test
  // then fails and says exactly which sentence lost its translation, instead
  // of the Spanish silently reverting to English on somebody's phone.
  'You reported pain of 3 or more on this movement. Nothing gets pushed past failure while that is true.':
    'Reportaste dolor de 3 o más en este ejercicio. Nada se lleva más allá del fallo mientras eso sea así.',
  'You have already added 2 finishers today. That is the fatigue budget.':
    'Ya añadiste 2 remates hoy. Ese es el presupuesto de fatiga.',
  'Finish your planned working sets first.': 'Primero termina las series de trabajo que tenías planeadas.',
  'Your weekly volume for this muscle is already inside its range. Drop sets and rest-pause are a way to buy volume cheaply when time is short, not extra growth on top — so there is nothing to buy.':
    'Tu volumen semanal para este músculo ya está dentro de su rango. Las series descendentes y el rest-pause sirven para conseguir volumen barato cuando falta tiempo, no para crecer de más — así que no hay nada que ganar.',
  'Not enough logged history this week to know whether your volume for this muscle is short.':
    'No hay suficiente historial esta semana para saber si te falta volumen en este músculo.',

  // --- The hypertrophy audit ------------------------------------------------
  'Weekly volume': 'Volumen semanal',
  'Proximity to failure': 'Cercanía al fallo',
  Frequency: 'Frecuencia',
  'Rest between sets': 'Descanso entre series',
  'Range of motion': 'Rango de movimiento',
  'Log a full week of training and this fills in.':
    'Registra una semana completa de entrenamiento y esto se rellena solo.',
  'Log reps in reserve on your sets and this fills in.':
    'Anota las repeticiones en reserva de tus series y esto se rellena solo.',
  'Hold here. Volume is the strongest lever you have, and it is doing its job.':
    'Quédate aquí. El volumen es la palanca más fuerte que tienes, y está haciendo su trabajo.',
  'That is the window. Sets close to failure count; comfortable ones mostly do not.':
    'Esa es la ventana. Las series cerca del fallo cuentan; las cómodas casi no.',
  'Take more sets to within 1–3 reps of failure. A set you could have doubled is not a hard set.':
    'Lleva más series a 1–3 repeticiones del fallo. Una serie que podrías haber doblado no es una serie dura.',

  // --- The verdict headline: the one line somebody actually reads ----------
  'You are leaving reps in the tank on {leavingReps} of {movements} movements':
    'Estás dejando repeticiones sin hacer en {leavingReps} de {movements} ejercicios',
  'Progressing on {gaining} of {judged} movements': 'Progresando en {gaining} de {judged} ejercicios',
  '{stalled} of {judged} movements have stopped moving':
    '{stalled} de {judged} ejercicios dejaron de avanzar',
  'Not enough logged yet to judge this': 'Todavía no hay suficiente registrado para juzgarlo',
  'Sets finishing more than {rirMax} reps short of failure do most of the work of a warm-up and little of the work of a hard set. That is the first thing to fix, before adding sets or changing anything else.':
    'Las series que terminan a más de {rirMax} repeticiones del fallo hacen casi el trabajo de un calentamiento y poco el de una serie dura. Eso es lo primero que hay que arreglar, antes de añadir series o cambiar cualquier otra cosa.',
  'The load is moving on most of what you train. 1 movement has stopped, which is normal — the list below says which and what is likely behind it.':
    'La carga está subiendo en casi todo lo que entrenas. 1 ejercicio se detuvo, lo cual es normal — la lista de abajo dice cuál y qué hay detrás.',
  'The load is moving on most of what you train. {stalled} movements have stopped, which is normal — the list below says which and what is likely behind it.':
    'La carga está subiendo en casi todo lo que entrenas. {stalled} ejercicios se detuvieron, lo cual es normal — la lista de abajo dice cuáles y qué hay detrás.',
  'The load is moving on everything you are training often enough to judge. This is what working looks like; the job now is to keep doing it.':
    'La carga está subiendo en todo lo que entrenas con suficiente frecuencia para juzgarlo. Así se ve cuando funciona; ahora toca seguir haciéndolo.',
  'More of what you train is flat than is moving. The list below separates the ones where effort is the cause from the ones where it is not, because they need opposite fixes.':
    'Hay más de lo que entrenas estancado que avanzando. La lista de abajo separa aquellos donde el esfuerzo es la causa de aquellos donde no lo es, porque necesitan soluciones opuestas.',
  'A verdict needs at least {min} sessions on a movement inside {days} days. Keep logging and this fills in on its own.':
    'Para dar un veredicto hacen falta al menos {min} sesiones de un ejercicio dentro de {days} días. Sigue registrando y esto se llena solo.',
  'Last {days} days': 'Últimos {days} días',
  gaining: 'subiendo',
  slipping: 'bajando',
  flat: 'estancado',
  'too few': 'muy pocas',
  attention: 'atención',
  good: 'bien',
  'no call': 'sin veredicto',

  // --- The coaching verdict, as templates from the engine -------------------
  'Only 1 session in the last {days} days — not enough to call a trend yet.':
    'Solo 1 sesión en los últimos {days} días — todavía no alcanza para hablar de una tendencia.',
  'Only {sessions} sessions in the last {days} days — not enough to call a trend yet.':
    'Solo {sessions} sesiones en los últimos {days} días — todavía no alcanza para hablar de una tendencia.',
  'Going up ({pct}) and the sets are landing in the right effort window. Leave it alone.':
    'Va subiendo ({pct}) y las series caen en la ventana de esfuerzo correcta. Déjalo como está.',
  'Going up ({pct}), and at a median of {rir} reps in reserve there is more in the tank.':
    'Va subiendo ({pct}), y con una mediana de {rir} repeticiones en reserva todavía te queda margen.',
  'Going up ({pct}), though the sets are running very close to failure.':
    'Va subiendo ({pct}), aunque las series están yendo muy cerca del fallo.',
  'Flat ({pct}), at a median of {rir} reps in reserve. That is the likely reason — a set you could have doubled is not a hard set.':
    'Estancado ({pct}), con una mediana de {rir} repeticiones en reserva. Esa es la causa probable — una serie que podrías haber doblado no es una serie dura.',
  'Going backwards ({pct}), at a median of {rir} reps in reserve. That is the likely reason — a set you could have doubled is not a hard set.':
    'Yendo hacia atrás ({pct}), con una mediana de {rir} repeticiones en reserva. Esa es la causa probable — una serie que podrías haber doblado no es una serie dura.',
  'Flat ({pct}), and the sets are going to failure or past it. More effort is not the missing ingredient here; recovery or volume might be.':
    'Estancado ({pct}), y las series van al fallo o más allá. Aquí lo que falta no es esfuerzo; puede ser recuperación o volumen.',
  'Going backwards ({pct}), and the sets are going to failure or past it. More effort is not the missing ingredient here; recovery or volume might be.':
    'Yendo hacia atrás ({pct}), y las series van al fallo o más allá. Aquí lo que falta no es esfuerzo; puede ser recuperación o volumen.',
  'Going backwards ({pct}) despite the effort being in the right window. Worth checking sleep, food and how much else is being trained.':
    'Yendo hacia atrás ({pct}) aunque el esfuerzo está en la ventana correcta. Vale la pena revisar sueño, comida y cuánto más estás entrenando.',
  'Flat ({pct}) at a reasonable effort. Normal for a stretch — if it holds another few weeks, change the rep range or the movement.':
    'Estancado ({pct}) con un esfuerzo razonable. Normal por una temporada — si sigue así unas semanas más, cambia el rango de repeticiones o el ejercicio.',

  // --- Today's plan, deloads and energy targets ----------------------------
  'Session in progress': 'Sesión en curso',
  'You have an unfinished session. Pick up exactly where you left off — every set you already logged is saved.':
    'Tienes una sesión sin terminar. Retómala justo donde la dejaste: todas las series que ya registraste están guardadas.',
  'Finishing an interrupted session still counts in full.':
    'Terminar una sesión interrumpida cuenta igualmente por completo.',
  'Build your plan': 'Crea tu plan',
  'No program yet': 'Todavía sin programa',
  'FORGED needs a program before it can tell you what to train. Generate one from your profile or build a custom routine — it takes about a minute.':
    'FORGED necesita un programa antes de poder decirte qué entrenar. Genera uno desde tu perfil o crea una rutina propia: se tarda un minuto.',
  'A plan turns training into something FORGED can progress for you.':
    'Un plan convierte el entrenamiento en algo que FORGED puede hacer progresar por ti.',
  'Lighter on purpose': 'Más suave a propósito',
  'You are in a planned deload. Same movements, roughly 60% of the usual load, fewer sets, and every set stopped well short of failure. This counts as a completed session — backing off on purpose is training, not time off.':
    'Estás en una descarga planificada. Los mismos movimientos, en torno al 60 % de la carga habitual, menos series y todas paradas bastante antes del fallo. Cuenta como sesión completada: bajar el pie a propósito es entrenar, no descansar.',
  'Finishing the deload clears accumulated fatigue so the next block actually moves.':
    'Terminar la descarga limpia la fatiga acumulada para que el siguiente bloque avance de verdad.',
  '{movements} movements · {sets} working sets':
    '{movements} movimientos · {sets} series de trabajo',
  'This is the session you missed on {date}, moved to today rather than stacked on top of another day.':
    'Esta es la sesión que te saltaste el {date}, movida a hoy en vez de amontonada sobre otro día.',
  '{day} is scheduled for today in your plan. FORGED has a specific target for every movement based on what you did last time.':
    'Hoy toca {day} según tu plan. FORGED tiene un objetivo concreto para cada movimiento según lo que hiciste la última vez.',
  '{sets} hard sets toward this week\'s volume, and a fresh recommendation for every lift you log.':
    '{sets} series duras para el volumen de esta semana, y una recomendación nueva por cada ejercicio que registres.',
  '{km} km': '{km} km',
  '{min} min': '{min} min',
  'No lifting scheduled today, which makes it the cheapest possible day to run — endurance work sits furthest from your hard lower-body sessions here.':
    'Hoy no hay pesas programadas, lo que lo convierte en el día más barato para correr: el trabajo de resistencia queda lo más lejos posible de tus sesiones duras de tren inferior.',
  'Adds to this week’s running volume without competing with a lifting session.':
    'Suma al volumen de carrera de esta semana sin competir con una sesión de pesas.',
  'Recovery day': 'Día de recuperación',
  'Prescribed, not skipped': 'Prescrito, no saltado',
  'Nothing is scheduled today. Adaptation happens between sessions, not during them — a recovery day is part of the plan and counts toward your consistency exactly like a training day.':
    'Hoy no hay nada programado. La adaptación ocurre entre sesiones, no durante ellas: un día de recuperación forma parte del plan y cuenta para tu constancia igual que un día de entrenamiento.',
  'Log a check-in and hit your protein target to bank the day.':
    'Registra tu control diario y llega a tu objetivo de proteína para cerrar el día.',
  '{count} fatigue signals are firing at once: {signals}. That pattern usually means accumulated fatigue is masking your actual fitness. A week at roughly {load}% of your usual load and {volume}% of your usual sets normally brings performance back up rather than down.':
    'Hay {count} señales de fatiga activas a la vez: {signals}. Ese patrón suele significar que la fatiga acumulada está tapando tu forma real. Una semana con en torno al {load} % de tu carga habitual y el {volume} % de tus series suele devolver el rendimiento hacia arriba, no hacia abajo.',
  '{count} of {needed} deload signals are currently firing. Keep training as planned and keep checking in — FORGED will flag it if the pattern builds.':
    'Hay {count} de {needed} señales de descarga activas. Sigue entrenando según el plan y sigue registrando tus controles: FORGED te avisará si el patrón crece.',
  'You backed off recently, so FORGED is holding off on another deload suggestion for now ({days}-day cooldown).':
    'Bajaste el pie hace poco, así que FORGED no sugerirá otra descarga por ahora (espera de {days} días).',
  'Keep the same movements. Cut working sets by about {volume}% and load by about {load}%, and stop every set well short of failure (4+ reps in reserve). Keep easy running, keep protein where it is, and sleep as much as you can.':
    'Mantén los mismos movimientos. Recorta las series de trabajo en torno a un {volume} % y la carga en torno a un {load} %, y para cada serie bastante antes del fallo (4+ repeticiones en reserva). Sigue corriendo suave, deja la proteína donde está y duerme todo lo que puedas.',
  'Estimated maintenance is about {maintenance} kcal — {bmr} kcal at rest, plus your daily activity, plus roughly {training} kcal a day of training. For {goal}, FORGED sets {direction}: {target} kcal.':
    'Tu mantenimiento estimado ronda las {maintenance} kcal: {bmr} kcal en reposo, más tu actividad diaria, más unas {training} kcal al día de entrenamiento. Para {goal}, FORGED fija {direction}: {target} kcal.',
  'Estimated maintenance is about {maintenance} kcal — {bmr} kcal at rest, plus your daily activity, plus roughly {training} kcal a day of training. For {goal}, FORGED sets {direction}: {target} kcal. The number was adjusted to stay inside the safe bounds in the rules file.':
    'Tu mantenimiento estimado ronda las {maintenance} kcal: {bmr} kcal en reposo, más tu actividad diaria, más unas {training} kcal al día de entrenamiento. Para {goal}, FORGED fija {direction}: {target} kcal. El número se ajustó para quedarse dentro de los límites seguros del archivo de reglas.',
  'Using your manual target of {target} kcal. For reference, FORGED estimates your maintenance at about {maintenance} kcal.':
    'Usando tu objetivo manual de {target} kcal. Como referencia, FORGED estima tu mantenimiento en unas {maintenance} kcal.',
  'a small surplus': 'un pequeño superávit',
  'a moderate deficit': 'un déficit moderado',
  'maintenance': 'mantenimiento',
  'building muscle': 'ganar músculo',
  'getting stronger': 'ganar fuerza',
  'a slow recomposition': 'una recomposición lenta',
  'losing fat while keeping muscle': 'perder grasa manteniendo músculo',
  'general fitness': 'forma física general',
}
