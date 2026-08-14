import type { Dict } from '@/i18n'

/**
 * Spanish for the exercise library and the muscle map.
 *
 * These reach further than any screen — an exercise name appears in the
 * session player, the history, the volume dashboard, the coaching verdict and
 * the program editor. Translating the chrome and leaving "Barbell Bench Press"
 * in English gets you a Spanish app that still speaks English about the actual
 * training.
 *
 * The names are the ones used on a Spanish-speaking gym floor, not literal
 * translations: "press de banca", not "prensa de banco"; "peso muerto", not
 * "levantamiento muerto"; "jalón al pecho" for the lat pulldown. Where English
 * is what people actually say — "hip thrust", "face pull", "curl" — it is left
 * alone rather than replaced with something nobody would use out loud.
 */
export const DATA: Dict = {
  // --- Muscles --------------------------------------------------------------
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

  // --- Push -----------------------------------------------------------------
  'Barbell Bench Press': 'Press de Banca con Barra',
  'Dumbbell Bench Press': 'Press de Banca con Mancuernas',
  'Incline Dumbbell Press': 'Press Inclinado con Mancuernas',
  'Machine Chest Press': 'Press de Pecho en Máquina',
  'Push-Up': 'Flexión',
  'Cable Fly': 'Aperturas en Polea',
  'Pec Deck': 'Contractor de Pecho',
  'Chest Dip': 'Fondo de Pecho',
  'Overhead Press': 'Press Militar',
  'Dumbbell Shoulder Press': 'Press de Hombro con Mancuernas',
  'Machine Shoulder Press': 'Press de Hombro en Máquina',
  'Lateral Raise': 'Elevación Lateral',
  'Cable Lateral Raise': 'Elevación Lateral en Polea',
  'Machine Lateral Raise': 'Elevación Lateral en Máquina',
  'Close-Grip Bench Press': 'Press de Banca Agarre Cerrado',
  'Triceps Pushdown': 'Extensión de Tríceps en Polea',
  'Overhead Triceps Extension': 'Extensión de Tríceps sobre la Cabeza',

  // --- Pull -----------------------------------------------------------------
  'Pull-Up': 'Dominada',
  'Assisted Pull-Up': 'Dominada Asistida',
  'Lat Pulldown': 'Jalón al Pecho',
  'Barbell Row': 'Remo con Barra',
  'One-Arm Dumbbell Row': 'Remo a Una Mano con Mancuerna',
  'Chest-Supported Row': 'Remo con Pecho Apoyado',
  'Seated Cable Row': 'Remo Sentado en Polea',
  'Face Pull': 'Face Pull',
  'Reverse Pec Deck': 'Contractor Inverso',
  'Dumbbell Shrug': 'Encogimiento con Mancuernas',
  'Barbell Curl': 'Curl con Barra',
  'Dumbbell Curl': 'Curl con Mancuernas',
  'Hammer Curl': 'Curl Martillo',
  'Cable Curl': 'Curl en Polea',
  'Machine Curl': 'Curl en Máquina',
  'Preacher Curl': 'Curl Predicador',

  // --- Legs -----------------------------------------------------------------
  'Back Squat': 'Sentadilla Trasera',
  'Front Squat': 'Sentadilla Frontal',
  'Goblet Squat': 'Sentadilla Goblet',
  'Leg Press': 'Prensa de Piernas',
  'Hack Squat': 'Sentadilla Hack',
  'Bulgarian Split Squat': 'Sentadilla Búlgara',
  'Walking Lunge': 'Zancada Caminando',
  'Conventional Deadlift': 'Peso Muerto Convencional',
  'Trap-Bar Deadlift': 'Peso Muerto con Barra Hexagonal',
  'Romanian Deadlift': 'Peso Muerto Rumano',
  'Hip Thrust': 'Hip Thrust',
  'Back Extension': 'Extensión Lumbar',
  'Seated Leg Curl': 'Curl Femoral Sentado',
  'Lying Leg Curl': 'Curl Femoral Tumbado',
  'Leg Extension': 'Extensión de Cuádriceps',
  'Standing Calf Raise': 'Elevación de Gemelos de Pie',
  'Seated Calf Raise': 'Elevación de Gemelos Sentado',

  // --- Core and carries -----------------------------------------------------
  'Hanging Knee Raise': 'Elevación de Rodillas Colgado',
  'Cable Crunch': 'Crunch en Polea',
  Plank: 'Plancha',
  'Pallof Press': 'Press Pallof',
  'Farmer Carry': 'Paseo del Granjero',

  // --- Home and bodyweight --------------------------------------------------
  'Bodyweight Squat': 'Sentadilla sin Peso',
  'Split Squat': 'Zancada Estática',
  'Glute Bridge': 'Puente de Glúteos',
  'Single-Leg Glute Bridge': 'Puente de Glúteos a Una Pierna',
  'Nordic Hamstring Curl': 'Curl Nórdico',
  'Inverted Row': 'Remo Invertido',
  'Underhand Inverted Row': 'Remo Invertido Supino',
  'Chin-Up': 'Dominada Supina',
  'Pike Push-Up': 'Flexión Pica',
  'Diamond Push-Up': 'Flexión Diamante',
  'Bench Dip': 'Fondo en Banco',
  'Incline Push-Up': 'Flexión Inclinada',
  'Single-Leg Calf Raise': 'Elevación de Gemelo a Una Pierna',
  'Side Plank': 'Plancha Lateral',
  'Hollow Hold': 'Hollow Hold',
}
