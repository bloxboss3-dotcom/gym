import type { Dict } from '@/i18n'

/**
 * Spanish for the train surface. Keys are the exact English source strings.
 *
 * Covers the Train hub (today's session, your usual sessions, training
 * off-plan, the library and history) and the program editor.
 *
 * Two things are deliberately absent. Exercise names are not here — they are a
 * catalogue of their own and belong to the data namespace, so this file wraps
 * them at the point of render and lets that namespace supply the Spanish.
 * Program and day names are not here either: those are the person's own words,
 * typed into a field they can edit, and translating somebody's data is how you
 * lose it.
 */
export const TRAIN: Dict = {
  // -------------------------------------------------------------- Train hub
  'No program yet': 'Aún no hay programa',
  'Unfinished session': 'Sesión sin terminar',
  'Everything you logged is saved. Pick up where you stopped.':
    'Todo lo que registraste está guardado. Sigue donde lo dejaste.',

  // Deload. "Descarga" is what a deload week is called in a Spanish-speaking
  // gym; "semana ligera" would describe it but is not the term.
  'Deload week in progress': 'Semana de descarga en curso',
  'Sessions start at roughly 60% load with fewer sets. Completing them counts exactly like a normal session — that is the point.':
    'Las sesiones empiezan con cerca del 60% de la carga y menos series. Completarlas cuenta igual que una sesión normal — de eso se trata.',

  'FORGED needs a plan before it can progress anything for you. Generate one from your profile, or build a custom routine.':
    'FORGED necesita un plan antes de poder progresar nada por ti. Genera uno desde tu perfil o arma una rutina personalizada.',
  'Generate from profile': 'Generar desde el perfil',

  // Today's card.
  Start: 'Empezar',
  'Choose a day': 'Elige un día',
  'Different day': 'Otro día',

  // Program day list.
  Edit: 'Editar',
  'Done today': 'Hecho hoy',
  '{sets} sets · ~{minutes} min': '{sets} series · ~{minutes} min',

  // --------------------------------------------------------------- Off-plan
  // The heading of the freestyle card. An imperative, like the English: it is
  // an invitation, not a category label.
  'Train off-plan': 'Entrena fuera del plan',
  'You do not have to follow the plans above. Start empty and add movements as you go — it logs, progresses and counts toward your weekly volume exactly the same.':
    'No tienes que seguir los planes de arriba. Empieza en blanco y añade movimientos sobre la marcha — se registra, progresa y cuenta para tu volumen semanal exactamente igual.',
  'Start a freestyle session': 'Empezar una sesión libre',
  Freestyle: 'Libre',
  'Build the session as you go': 'Arma la sesión sobre la marcha',

  // ---------------------------------------------------------------- Library
  'Log a run': 'Registrar una carrera',
  'Exercise library': 'Biblioteca de ejercicios',
  '{count} movements with transparent muscle mapping':
    '{count} movimientos con mapeo muscular transparente',
  Browse: 'Explorar',
  'Every exercise declares how much it contributes to each muscle. Those numbers are what the weekly volume dashboard adds up — nothing is hidden in a black box.':
    'Cada ejercicio declara cuánto aporta a cada músculo. El panel de volumen semanal suma esos números — no hay nada escondido en una caja negra.',
  'See weekly volume →': 'Ver volumen semanal →',
  'Tap any movement to see your full history, estimated 1RM trend and its muscle contributions.':
    'Toca cualquier movimiento para ver tu historial completo, la tendencia de 1RM estimado y sus aportes musculares.',

  // ---------------------------------------------------------------- History
  History: 'Historial',
  '{count} sets · {status}': '{count} series · {status}',
  // Session status, as it reads in the history line. "Sesión" is feminine, so
  // these agree with it rather than with the English participle.
  completed: 'completada',
  abandoned: 'abandonada',
  Yesterday: 'Ayer',
  'No sessions yet': 'Aún no hay sesiones',
  'Once you complete a session, it shows up here with its full set-by-set record.':
    'En cuanto completes una sesión, aparece aquí con su registro serie por serie.',
  'Start a session': 'Empezar una sesión',
  '{movements} movements · {sets} sets': '{movements} movimientos · {sets} series',

  // --------------------------------------------------- Your usual sessions
  'Your usual sessions': 'Tus sesiones de siempre',
  'Learned from what you actually log — not from the plan':
    'Aprendido de lo que registras de verdad — no del plan',
  // The weekday a pattern lands on, in brackets after its name. Spanish makes
  // the habit with the article rather than a plural -s: "(los lunes)".
  '({weekday}s)': '(los {weekday})',
  '{count} movements · done {times}×': '{count} movimientos · hecho {times}×',
  today: 'hoy',
  yesterday: 'ayer',
  '{days} days ago': 'hace {days} días',
  'Longest since': 'La más atrasada',
  'Start this session': 'Empezar esta sesión',
  'Loads come from your progression history for each movement, not from this pattern.':
    'Las cargas salen de tu historial de progresión de cada movimiento, no de este patrón.',

  // ---------------------------------------------------------- Program editor
  Program: 'Programa',
  'That program no longer exists.': 'Ese programa ya no existe.',
  'Program editor': 'Editor de programa',
  '{days} days · {sets} weekly sets': '{days} días · {sets} series semanales',
  'Program name': 'Nombre del programa',
  'Day {number}': 'Día {number}',
  'Name for {name}': 'Nombre de {name}',
  'Delete {name}': 'Eliminar {name}',
  'Scheduled day': 'Día programado',
  // The first cell of the weekday row: this day is not tied to a weekday. Kept
  // to one short word because eight cells share the width of a phone.
  Any: 'Libre',
  '{sets} × {repMin}–{repMax} · {rir} RIR · {rest}s rest':
    '{sets} × {repMin}–{repMax} · {rir} RIR · {rest}s de descanso',
  'Move up': 'Subir',
  'Move down': 'Bajar',
  'Edit {name}': 'Editar {name}',
  'Remove {name}': 'Quitar {name}',
  exercise: 'ejercicio',
  Exercise: 'Ejercicio',
  'Add exercise': 'Añadir ejercicio',
  'Add day': 'Añadir día',
  'New exercise': 'Ejercicio nuevo',
  'Planned weekly sets': 'Series semanales planificadas',
  'What this program schedules per muscle, before you train it.':
    'Lo que este programa asigna a cada músculo, antes de que lo entrenes.',
  'Add some exercises to see planned volume.':
    'Añade ejercicios para ver el volumen planificado.',
  'Delete this program': 'Eliminar este programa',
  'Delete this program?': '¿Eliminar este programa?',
  'The program and its day structure are removed. Sessions you already completed are kept — your history and recommendations are unaffected.':
    'Se elimina el programa y su estructura de días. Las sesiones que ya completaste se conservan — tu historial y tus recomendaciones no cambian.',
  'Delete program': 'Eliminar programa',

  // ------------------------------------------------------------- Slot editor
  'Working sets': 'Series efectivas',
  'Min reps': 'Reps mín.',
  'Minimum reps': 'Repeticiones mínimas',
  'Max reps': 'Reps máx.',
  'Maximum reps': 'Repeticiones máximas',
  'Target reps in reserve': 'Repeticiones en reserva objetivo',
  '1–3 is the usual window for productive working sets.':
    '1–3 es el rango habitual para series efectivas productivas.',
  'Target RIR': 'RIR objetivo',
  'Rest between sets': 'Descanso entre series',
  'Rest seconds': 'Segundos de descanso',
  'Smallest load increment ({units})': 'Incremento de carga más pequeño ({units})',
  'The smallest jump your plates, dumbbells or stack actually allow. Progression uses this exact number.':
    'El salto más pequeño que permiten de verdad tus discos, mancuernas o placas. La progresión usa exactamente ese número.',
  'Load increment': 'Incremento de carga',
  Done: 'Listo',

  // -------------------------------------------------------- Custom exercise
  'Create exercise': 'Crear ejercicio',
  'Exercise name': 'Nombre del ejercicio',
  'e.g. Landmine press': 'p. ej. press con landmine',
  'Muscle contributions': 'Aportes musculares',
  '1.0 = a direct hard set for that muscle, 0.5 = a meaningful assist. These numbers are what the volume dashboard sums.':
    '1.0 = una serie dura directa para ese músculo, 0.5 = una ayuda real. El panel de volumen suma estos números.',
  'How is it loaded?': '¿Cómo se carga?',
  'Decides what the weight box means when you log it.':
    'Define qué significa la casilla de peso cuando lo registras.',
  'Loading style': 'Tipo de carga',
  Barbell: 'Barra',
  'You log the total on the bar, bar included': 'Registras el total en la barra, barra incluida',
  'Two dumbbells': 'Dos mancuernas',
  'You log the number on one of them': 'Registras el número de una de ellas',
  'One dumbbell or kettlebell': 'Una mancuerna o pesa rusa',
  'You log the implement': 'Registras el implemento',
  'Machine or cable': 'Máquina o polea',
  'You log the pin setting': 'Registras la posición del pin',
  'Body weight': 'Peso corporal',
  'You log any ADDED weight, 0 for none': 'Registras el peso AÑADIDO, 0 si no hay',
  'Something else': 'Otra cosa',
  'Bands, sled, odd objects': 'Bandas, trineo, objetos raros',
  'Smallest load increment (kg)': 'Incremento de carga más pequeño (kg)',
  Increment: 'Incremento',
  'Lower-body movement (bigger jumps)': 'Movimiento de tren inferior (saltos más grandes)',
  'Upper-body movement (smaller jumps)': 'Movimiento de tren superior (saltos más pequeños)',
  'Pick at least one muscle so this exercise counts toward your weekly volume.':
    'Elige al menos un músculo para que este ejercicio cuente en tu volumen semanal.',
  // Stored on a custom exercise as its coaching cue, so the English is what
  // lands in the record and this is what any screen showing it looks up.
  'Your movement, your cue.': 'Tu movimiento, tu consigna.',

  // ------------------------------------------------------------- Weekdays
  // Rendered by `weekdayName`, which this surface wraps at the point of use.
  // The short forms are also sliced to two characters for the day picker, so
  // they have to stay distinct at Lu/Ma/Mi/Ju/Vi/Sá/Do.
  //
  // The long forms are plural and lowercase, because the only place they are
  // rendered is "({weekday}s)" → "(los lunes)". Monday through Friday do not
  // change in the plural; Saturday and Sunday do, which is exactly why the
  // "s" cannot live in the template.
  Mon: 'Lun',
  Tue: 'Mar',
  Wed: 'Mié',
  Thu: 'Jue',
  Fri: 'Vie',
  Sat: 'Sáb',
  Sun: 'Dom',
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miércoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sábados',
  Sunday: 'domingos',

  // --------------------------------------------------------------- Muscles
  // Shown by the planned-volume list and the custom-exercise form. The data
  // namespace owns the catalogue; these are here so the program editor is not
  // half English while that lands.
  Chest: 'Pecho',
  'Front delts': 'Deltoides anterior',
  'Side delts': 'Deltoides lateral',
  'Rear delts': 'Deltoides posterior',
  Triceps: 'Tríceps',
  Lats: 'Dorsales',
  'Upper back': 'Espalda alta',
  Traps: 'Trapecios',
  Biceps: 'Bíceps',
  Forearms: 'Antebrazos',
  Quads: 'Cuádriceps',
  Hamstrings: 'Isquiotibiales',
  Glutes: 'Glúteos',
  Adductors: 'Aductores',
  Calves: 'Gemelos',
  Abs: 'Abdominales',
  'Lower back': 'Espalda baja',
}
