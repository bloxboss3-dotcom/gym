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

  // --- Running plan --------------------------------------------------------
  'Cut back to {km} km this week': 'Baja a {km} km esta semana',
  'Hold at {km} km this week': 'Mantente en {km} km esta semana',
  'Start with walk/run intervals': 'Empieza con intervalos de caminar y correr',
  'Benchmark week — {km} km including a 5K test':
    'Semana de referencia: {km} km incluyendo un test de 5K',
  'Build to {km} km this week': 'Sube hasta {km} km esta semana',
  'You logged pain of {pain}/10 on a recent run. Running through a niggle is the most common way a two-week problem becomes a two-month one. Drop roughly {pct}% of your volume, keep everything easy, and rebuild once you are pain-free.':
    'Registraste un dolor de {pain}/10 en una carrera reciente. Correr con una molestia es la forma más común de que un problema de dos semanas se convierta en uno de dos meses. Baja en torno a un {pct} % de tu volumen, mantén todo suave y reconstruye cuando no te duela nada.',
  'If the pain is sharp, localised to a bone, or gets worse as you run, stop running and see a physiotherapist or physician.':
    'Si el dolor es agudo, se localiza en un hueso o empeora mientras corres, deja de correr y acude a un fisioterapeuta o a un médico.',
  'Your runs last week averaged {rpe}/10 effort. That is hard for easy running. Repeat the same volume at a genuinely conversational pace before adding anything — most easy runs should feel almost too easy.':
    'Tus carreras de la semana pasada promediaron un esfuerzo de {rpe}/10. Eso es mucho para carrera suave. Repite el mismo volumen a un ritmo en el que puedas hablar de verdad antes de añadir nada: la mayoría de carreras suaves deberían parecer casi demasiado fáciles.',
  'Last week came in at {last} km against {prior} km the week before. Adding volume on top of a week you did not finish stacks the deficit. Repeat the same target and bank a complete week first.':
    'La semana pasada quedó en {last} km frente a {prior} km la anterior. Añadir volumen sobre una semana que no terminaste acumula el déficit. Repite el mismo objetivo y asegura primero una semana completa.',
  'You are starting from {km} km a week, so FORGED begins with walk/run intervals rather than continuous running. Impact tolerance builds more slowly than fitness does — the aim for the first few weeks is finishing every session feeling like you could have done another one.':
    'Empiezas desde {km} km por semana, así que FORGED arranca con intervalos de caminar y correr en vez de carrera continua. La tolerancia al impacto se construye más despacio que la forma física: el objetivo de las primeras semanas es terminar cada sesión sintiendo que podrías haber hecho otra.',
  'You completed last week\'s running ({previous} km), nothing hurt, and the effort sat in a sensible range. FORGED adds {add} km — a {pct}% step sized for a {experience} runner. This is not a fixed 10% rule: the cap moves with your experience, and it only applies when you actually finished the previous week.':
    'Completaste la carrera de la semana pasada ({previous} km), nada te dolió y el esfuerzo estuvo en un rango sensato. FORGED añade {add} km: un paso del {pct} % ajustado a un corredor {experience}. Esto no es una regla fija del 10 %: el tope se mueve con tu experiencia y solo se aplica cuando de verdad terminaste la semana anterior.',
  'You lift legs on {days}. Because you told FORGED muscle comes first, keep hard running at least {hours} hours away from those sessions — and ideally on a different day. Easy running on leg days is fine.':
    'Entrenas pierna los {days}. Como le dijiste a FORGED que el músculo va primero, mantén la carrera dura al menos {hours} horas lejos de esas sesiones, e idealmente en otro día. Correr suave los días de pierna está bien.',
  'Endurance is your priority, so run first when a run and a lift land on the same day, and treat lower-body lifting as the session that gives ground.':
    'La resistencia es tu prioridad, así que corre primero cuando una carrera y unas pesas caigan el mismo día, y deja que sea el trabajo de tren inferior el que ceda.',
  'When a hard run and hard leg training land on the same day, put several hours between them and do the one that matters more to you first.':
    'Cuando una carrera dura y un entrenamiento duro de pierna caen el mismo día, deja varias horas entre ellos y haz primero el que más te importe.',
  'Walk/run: 5 min brisk walk, then 6 × (2 min easy jog / 2 min walk), 5 min walk to finish. Conversational effort throughout.':
    'Caminar/correr: 5 min de marcha rápida, luego 6 × (2 min de trote suave / 2 min andando) y 5 min andando para terminar. Esfuerzo conversacional todo el rato.',
  'Long easy run — conversational pace the whole way. Keep it under {pct}% of your weekly volume.':
    'Carrera larga y suave, a ritmo conversacional todo el camino. Mantenla por debajo del {pct} % de tu volumen semanal.',
  'Easy aerobic run. If you cannot hold a conversation, slow down.':
    'Carrera aeróbica suave. Si no puedes mantener una conversación, baja el ritmo.',
  'Threshold: 15 min easy, then 2 × 8 min at "comfortably hard" with 3 min easy between, 10 min easy.':
    'Umbral: 15 min suaves, luego 2 × 8 min a un ritmo «cómodamente duro» con 3 min suaves entre medias, y 10 min suaves.',
  'Intervals: 12 min easy, then 6 × 400 m at a strong but controlled effort with 90 s walk/jog, 10 min easy.':
    'Series: 12 min suaves, luego 6 × 400 m a un esfuerzo fuerte pero controlado con 90 s andando o trotando, y 10 min suaves.',
  'Very easy shake-out. Stop early if anything is sore or painful.':
    'Trote muy suave de soltura. Párate antes si algo está dolorido o duele.',
  'Benchmark 5K: 10 min easy warm-up, then 5 km as a steady hard effort you can hold to the finish. Log the time so FORGED can compare it later.':
    '5K de referencia: 10 min de calentamiento suave, luego 5 km a un esfuerzo duro y sostenido que puedas mantener hasta el final. Registra el tiempo para que FORGED pueda compararlo después.',

  // --- Usual sessions, generated programs and protein ----------------------
  'You have trained this combination {times} times in the last {days} days, most recently today.':
    'Has entrenado esta combinación {times} veces en los últimos {days} días, la última hoy.',
  'You have trained this combination {times} times in the last {days} days, most recently yesterday.':
    'Has entrenado esta combinación {times} veces en los últimos {days} días, la última ayer.',
  'You have trained this combination {times} times in the last {days} days, most recently {since} days ago.':
    'Has entrenado esta combinación {times} veces en los últimos {days} días, la última hace {since} días.',
  '{sessions} sessions a week, {movements} movements each, built for {goal}. Volume starts near the bottom of the {min}–{max} weekly-sets-per-muscle range for a {experience} lifter — there is no advantage in starting where you want to finish.':
    '{sessions} sesiones por semana, {movements} movimientos cada una, pensadas para {goal}. El volumen empieza cerca del extremo bajo del rango de {min}–{max} series semanales por músculo para un nivel {experience}: no hay ninguna ventaja en empezar donde quieres acabar.',
  'Using your manual target of {target} g/day. For reference, {baselinePerKg} g/kg on your {weightKind} weight is about {baseline} g, and the practical range is {min}–{max} g.':
    'Usando tu objetivo manual de {target} g/día. Como referencia, {baselinePerKg} g/kg sobre tu peso {weightKind} son unos {baseline} g, y el rango práctico es {min}–{max} g.',
  'You\'re training in or near an energy deficit, so FORGED points to {gPerKg} g/kg — the upper part of the practical range — to help protect lean mass. Anything from {min} to {max} g is defensible.':
    'Estás entrenando en déficit energético o cerca de él, así que FORGED apunta a {gPerKg} g/kg —la parte alta del rango práctico— para ayudar a proteger la masa magra. Cualquier cifra entre {min} y {max} g es defendible.',
  '{gPerKg} g/kg sits just above the {baselinePerKg} g/kg breakpoint where additional protein stops adding much. The full practical range is {min}–{max} g/day.':
    '{gPerKg} g/kg queda justo por encima del punto de inflexión de {baselinePerKg} g/kg, donde más proteína deja de aportar gran cosa. El rango práctico completo es {min}–{max} g/día.',
  'estimated lean': 'magro estimado',
  'body': 'corporal',
  'muscle growth': 'el crecimiento muscular',
  'strength': 'la fuerza',
  'recomposition': 'la recomposición',
  'fat loss': 'la pérdida de grasa',
  'general fitness and health': 'la forma física y la salud general',

  // --- Goal and experience words used inside sentences ---------------------
  'fat loss while preserving muscle': 'la pérdida de grasa conservando músculo',
  'beginner': 'principiante',
  'intermediate': 'intermedio',
  'advanced': 'avanzado',

  // --- Consistency and the hypertrophy audit -------------------------------
  'You missed 1 planned day — streak protection covered it. Nothing lost.':
    'Te saltaste 1 día planificado; la protección de racha lo cubrió. No has perdido nada.',
  'You missed {missed} planned days — streak protection covered them. Nothing lost.':
    'Te saltaste {missed} días planificados; la protección de racha los cubrió. No has perdido nada.',
  '{missed} planned days missed in the last {days}. {shields} covered by streak protection. Consistency is a rolling average, so a good week pulls it straight back up.':
    '{missed} días planificados perdidos en los últimos {days}. {shields} cubiertos por la protección de racha. La constancia es una media móvil, así que una buena semana la vuelve a subir.',
  'No planned training days yet. Your consistency score starts building with your first scheduled session.':
    'Todavía no hay días de entrenamiento planificados. Tu puntuación de constancia empieza a construirse con tu primera sesión programada.',
  'Every planned day in the last {days} accounted for. This is the part that actually drives progress.':
    'Todos los días planificados de los últimos {days} cumplidos. Esta es la parte que de verdad impulsa el progreso.',
  '{inRange} of {assessed} muscles are inside their weekly set range.':
    '{inRange} de {assessed} músculos están dentro de su rango semanal de series.',
  'Add sets to the muscles below range, no more than {cap} per muscle per week.':
    'Añade series a los músculos por debajo del rango, no más de {cap} por músculo y semana.',
  '{pct}% of your working sets finished within {rir} reps of failure.':
    'El {pct} % de tus series de trabajo acabaron a {rir} repeticiones o menos del fallo.',
  '{twice} of {assessed} muscles were trained on two or more days.':
    '{twice} de {assessed} músculos se entrenaron en dos o más días.',
  'Split the same weekly sets across two days per muscle rather than one. It is the cheapest change on this list.':
    'Reparte las mismas series semanales en dos días por músculo en vez de uno. Es el cambio más barato de esta lista.',
  'Use the rest timer on your compound lifts and this fills in.':
    'Usa el temporizador de descanso en tus básicos y esto se rellenará.',
  'You typically rest about {seconds}s between compound sets.':
    'Sueles descansar unos {seconds} s entre series de básicos.',
  'Long enough. Rushing compounds costs you reps on the later sets, and lost reps are lost volume.':
    'Suficiente. Correr en los básicos te cuesta repeticiones en las series finales, y las repeticiones perdidas son volumen perdido.',
  'Rest two to three minutes on compound lifts. Short rest is not a shortcut — it just costs you reps later in the exercise.':
    'Descansa dos o tres minutos en los básicos. El descanso corto no es un atajo: solo te cuesta repeticiones más adelante en el ejercicio.',
  'Every movement in the library is prescribed at full range.':
    'Todos los movimientos de la biblioteca se prescriben a rango completo.',
  'Keep the stretch. Full range matches or beats partial range, and if you do shorten a movement, shorten the top — never the bottom.':
    'Conserva el estiramiento. El rango completo iguala o supera al parcial, y si acortas un movimiento, acorta arriba, nunca abajo.',

  // --- Dashboards, quest progress and the character screen -----------------
  'A “hard set” is a working set taken close enough to failure to matter (RIR ≤ {rir}). The shaded band is the starting range for a {experience} lifter ({min}–{max} sets). Around 10 sets per muscle per week is a common reference point in the research — an average, not a personal requirement, and not something to escalate past just because you can.':
    'Una «serie dura» es una serie de trabajo llevada lo bastante cerca del fallo como para contar (RIR ≤ {rir}). La banda sombreada es el rango inicial para un nivel {experience} ({min}–{max} series). Unas 10 series por músculo y semana es un punto de referencia habitual en la investigación: una media, no un requisito personal, y no algo que superar solo porque puedas.',
  'Nothing logged this week yet.': 'Todavía no hay nada registrado esta semana.',
  'Averaging {protein} g of protein and {kcal} kcal on the {days} days you tracked. Days with nothing logged count as unknown, not as failures.':
    'Promedias {protein} g de proteína y {kcal} kcal en los {days} días que registraste. Los días sin nada registrado cuentan como desconocidos, no como fallos.',
  'Averaging {protein} g of protein on the {days} days you tracked. Days with nothing logged count as unknown, not as failures.':
    'Promedias {protein} g de proteína en los {days} días que registraste. Los días sin nada registrado cuentan como desconocidos, no como fallos.',
  'At this intake the arithmetic implies roughly {kg} kg lost per week. Real bodies do not follow the arithmetic exactly — check it against your own weight trend after two or three weeks and adjust.':
    'Con esta ingesta, la aritmética implica en torno a {kg} kg perdidos por semana. Los cuerpos reales no siguen la aritmética exactamente: contrástalo con tu propia tendencia de peso al cabo de dos o tres semanas y ajusta.',
  'At this intake the arithmetic implies roughly {kg} kg gained per week. Real bodies do not follow the arithmetic exactly — check it against your own weight trend after two or three weeks and adjust.':
    'Con esta ingesta, la aritmética implica en torno a {kg} kg ganados por semana. Los cuerpos reales no siguen la aritmética exactamente: contrástalo con tu propia tendencia de peso al cabo de dos o tres semanas y ajusta.',
  'The rep drop after a load increase is the system working, not a regression. Upper-body jumps are kept around {upperMin}–{upperMax}%; lower body around {lowerMin}–{lowerMax}%, limited by what your gym actually stocks.':
    'La caída de repeticiones tras subir la carga es el sistema funcionando, no un retroceso. Los saltos de tren superior se mantienen en torno al {upperMin}–{upperMax} %; los de tren inferior en torno al {lowerMin}–{lowerMax} %, limitados por lo que de verdad tiene tu gimnasio.',
  'Fully built. Everything from here is gear.':
    'Constitución al máximo. A partir de aquí todo es equipo.',
  'Your warrior puts on muscle as you level, and levels come only from logged training. Nothing in the Forge can buy this.':
    'Tu guerrero gana músculo según subes de nivel, y los niveles solo vienen del entrenamiento registrado. Nada en la Fragua puede comprar esto.',
  '{n} sessions completed': '{n} sesiones completadas',
  '{n}/10 sessions': '{n}/10 sesiones',
  '{n}/30 sessions': '{n}/30 sesiones',
  'Consistency {pct}% over {days} planned days':
    'Constancia del {pct} % sobre {days} días planificados',
  'No data yet': 'Todavía no hay datos',
  '{n} runs logged': '{n} carreras registradas',
  '{km}/50 km': '{km}/50 km',
  '{n}/5 days this week': '{n}/5 días esta semana',
  '{n} deloads completed': '{n} descargas completadas',
  '{n} lifts with records': '{n} ejercicios con récord',
  'No records yet': 'Todavía no hay récords',
  'No benchmark run logged': 'No hay carrera de referencia registrada',
  'Reach level 10': 'Llega al nivel 10',
  '{n}/100 sets with RIR': '{n}/100 series con RIR',

  // --- Volume suggestions and benchmark comparisons ------------------------
  '{sets} hard sets last week, below your {min}–{max} starting range, and you completed the week. Adding up to {cap} sets is a small, recoverable step.':
    '{sets} series duras la semana pasada, por debajo de tu rango inicial de {min}–{max}, y completaste la semana. Añadir hasta {cap} series es un paso pequeño y recuperable.',
  '{seconds} s faster than your previous best over this distance.':
    '{seconds} s más rápido que tu mejor marca en esta distancia.',
  '{seconds} s slower than your best. One benchmark is noisy — heat, sleep, and how recently you trained legs all move it.':
    '{seconds} s más lento que tu mejor marca. Una sola referencia es ruidosa: el calor, el sueño y lo reciente que sea tu entrenamiento de pierna la mueven.',
  'First benchmark at this distance — this is your reference point from now on.':
    'Primera referencia a esta distancia: este es tu punto de comparación a partir de ahora.',

  // --- Per-muscle volume assessments ---------------------------------------
  'No hard sets logged for this muscle this week.':
    'No hay series duras registradas para este músculo esta semana.',
  'Below your starting range of {min}–{max} sets. Adding a set or two is reasonable if recovery is good.':
    'Por debajo de tu rango inicial de {min}–{max} series. Añadir una o dos series es razonable si la recuperación va bien.',
  'Inside your {min}–{max} set starting range for a {experience} lifter. Progress the load before you add more sets.':
    'Dentro de tu rango inicial de {min}–{max} series para un nivel {experience}. Progresa la carga antes de añadir más series.',
  'Above your starting range. That is fine if you are recovering well — but extra sets are not free, and FORGED will not push you higher automatically.':
    'Por encima de tu rango inicial. Está bien si te estás recuperando bien, pero las series extra no son gratis y FORGED no te subirá más de forma automática.',
  'Past {ceiling} hard sets in a week. Very high volumes raise the recovery cost sharply without a guaranteed payoff. Consider whether quality is holding up.':
    'Más de {ceiling} series duras en una semana. Los volúmenes muy altos disparan el coste de recuperación sin un beneficio garantizado. Piensa si la calidad se está manteniendo.',

  // --- Deload signals ------------------------------------------------------
  'Elevated soreness': 'Agujetas elevadas',
  'Low readiness': 'Poca disposición',
  'Persistent joint discomfort': 'Molestias articulares persistentes',
  'Weeks of accumulated hard training': 'Semanas de entrenamiento duro acumulado',
  'Not enough repeated exercises in the last 10 days to judge.':
    'No hay suficientes ejercicios repetidos en los últimos 10 días para juzgarlo.',
  '{declining} of {tracked} tracked lifts went backwards.':
    '{declining} de {tracked} ejercicios seguidos han ido hacia atrás.',
  'No check-ins logged recently.': 'No hay controles diarios registrados recientemente.',
  'Average soreness {value}/5 (flag at {threshold}).':
    'Agujetas medias {value}/5 (se avisa a partir de {threshold}).',
  'Average readiness {value}/5 (flag at {threshold}).':
    'Disposición media {value}/5 (se avisa a partir de {threshold}).',
  'Average joint pain {value}/10 (flag at {threshold}).':
    'Dolor articular medio {value}/10 (se avisa a partir de {threshold}).',
  '1 session in the last {days} days ran well past the target effort.':
    '1 sesión de los últimos {days} días superó con creces el esfuerzo objetivo.',
  '{sessions} sessions in the last {days} days ran well past the target effort.':
    '{sessions} sesiones de los últimos {days} días superaron con creces el esfuerzo objetivo.',
  '1 consecutive week of training without a planned back-off (flag at {threshold}).':
    '1 semana seguida de entrenamiento sin una bajada planificada (se avisa a partir de {threshold}).',
  '{weeks} consecutive weeks of training without a planned back-off (flag at {threshold}).':
    '{weeks} semanas seguidas de entrenamiento sin una bajada planificada (se avisa a partir de {threshold}).',
}
