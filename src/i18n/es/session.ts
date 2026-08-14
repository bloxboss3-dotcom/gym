import type { Dict } from '@/i18n'

/**
 * Spanish for the workout player and everything around a session: the anvil,
 * the summary, the plate calculator, the challenge card.
 *
 * This is the screen somebody stands in front of between sets, so the wording
 * is as short as the English and shorter where Spanish allows it. Gym words
 * are the ones actually used on the floor — "series", "repeticiones", "RIR",
 * "discos", "barra".
 */
export const SESSION: Dict = {
  // --- The Anvil ------------------------------------------------------------
  'The Anvil': 'El Yunque',
  '{count} perfect': '{count} perfectos',
  '{count} missed': '{count} fallados',
  'Banked. Coins from the anvil are capped at {rounds} rounds a day — it is here to make the rest interval worth something, not to replace training.':
    'Guardado. Las monedas del yunque están limitadas a {rounds} rondas al día — está aquí para que el descanso valga algo, no para reemplazar el entrenamiento.',
  three: 'tres',
  'a few': 'unas pocas',
  'Back to the set': 'Volver a la serie',
  Perfect: 'Perfecto',
  Solid: 'Sólido',
  Missed: 'Fallado',
  Strike: 'Golpear',
  'Reduced motion is on, so the hammer still moves but nothing flashes. Tap Strike as it crosses the hot metal.':
    'El movimiento reducido está activado, así que el martillo se mueve pero nada destella. Toca Golpear cuando cruce el metal caliente.',
  'Tap as the hammer crosses the hot metal. Each strike is faster than the last — {seconds}s a pass now.':
    'Toca cuando el martillo cruce el metal caliente. Cada golpe es más rápido que el anterior — {seconds}s por pasada ahora.',

  // --- Session summary ------------------------------------------------------
  '~{minutes} min': '~{minutes} min',
  Summary: 'Resumen',
  'Session not found': 'Sesión no encontrada',
  'This session no longer exists. It may have been deleted or replaced by an imported backup.':
    'Esta sesión ya no existe. Puede que se haya borrado o reemplazado por una copia de seguridad importada.',
  'Back to Train': 'Volver a Entrenar',
  'Session complete': 'Sesión completada',
  'Volume load': 'Carga de volumen',
  Duration: 'Duración',
  'Average effort {rir} reps in reserve across {sets} rated sets':
    'Esfuerzo promedio de {rir} repeticiones en reserva en {sets} series valoradas',
  ' — more than half of those went to failure, which is more fatigue than most sessions need.':
    ' — más de la mitad llegaron al fallo, que es más fatiga de la que necesita la mayoría de las sesiones.',
  'No rewards for this one': 'Sin recompensas por esta',
  'Sessions need at least {sets} working sets to pay out. This one is saved either way and still counts toward your weekly volume.':
    'Las sesiones necesitan al menos {sets} series de trabajo para pagar. Esta se guarda igual y sigue contando para tu volumen semanal.',
  'Sessions need to run at least {minutes} minutes to pay out. The training is saved either way.':
    'Las sesiones tienen que durar al menos {minutes} minutos para pagar. El entrenamiento se guarda igual.',
  'Rewards earned': 'Recompensas ganadas',
  '+{count} coins': '+{count} monedas',
  'Pain was reported': 'Se reportó dolor',
  'FORGED will not add load to a movement that hurt. If it keeps happening, swap the movement or get it looked at by a physiotherapist — an app cannot assess an injury.':
    'FORGED no le añade carga a un ejercicio que dolió. Si sigue pasando, cambia el ejercicio o haz que lo revise un fisioterapeuta — una app no puede evaluar una lesión.',
  'Next session': 'Próxima sesión',
  'Generated from what you just logged.': 'Generado a partir de lo que acabas de registrar.',
  'No exercises were logged in this session.': 'No se registró ningún ejercicio en esta sesión.',
  'Personal records': 'Récords personales',
  'Best working set and best estimated 1RM per lift.':
    'Mejor serie de trabajo y mejor 1RM estimado por ejercicio.',
  'View progress': 'Ver progreso',
  " Effort was not recorded on {percent}% of sets, which lowers the confidence of next session's recommendations.":
    ' No se registró el esfuerzo en el {percent}% de las series, lo que baja la confianza de las recomendaciones de la próxima sesión.',
  "You have already hit today's ceiling of {xp} XP and {coins} coins. The session counts for everything else — volume, progression, your streak — it just cannot print more currency today.":
    'Ya alcanzaste el tope de hoy de {xp} XP y {coins} monedas. La sesión cuenta para todo lo demás — volumen, progresión, tu racha — solo que hoy ya no puede generar más monedas.',
  'It may have been deleted or restored from a different backup.':
    'Puede que se haya borrado o restaurado desde otra copia de seguridad.',

  // --- The player -----------------------------------------------------------
  '{clock} · {done}/{planned} working sets': '{clock} · {done}/{planned} series de trabajo',
  Rest: 'Descanso',
  'Hide anvil': 'Ocultar yunque',
  Anvil: 'Yunque',
  'Hide puzzle': 'Ocultar puzle',
  Puzzle: 'Puzle',
  'This session is closed': 'Esta sesión está cerrada',
  'You are viewing a {status} session. Start a new one from Train to keep logging.':
    'Estás viendo una sesión {status}. Empieza otra desde Entrenar para seguir registrando.',
  'No exercises in this session yet. Add one below to start logging.':
    'Todavía no hay ejercicios en esta sesión. Añade uno abajo para empezar a registrar.',
  'Session notes': 'Notas de la sesión',
  'Abandon session': 'Abandonar sesión',
  'Finish session · {count} sets logged': 'Terminar sesión · {count} series registradas',
  'Finish this session?': '¿Terminar esta sesión?',
  'You have not logged any working sets. Finishing now saves an empty session and will not earn rewards.':
    'No has registrado ninguna serie de trabajo. Terminar ahora guarda una sesión vacía y no dará recompensas.',
  '{count} working sets will be saved, your next-session recommendations will update, and rewards will be calculated.':
    'Se guardarán {count} series de trabajo, se actualizarán las recomendaciones para la próxima sesión y se calcularán las recompensas.',
  'Abandon this session?': '¿Abandonar esta sesión?',
  'Sets you already logged are kept for your records, but the session will not count toward your consistency or rewards. This cannot be undone.':
    'Las series que ya registraste se guardan en tu historial, pero la sesión no contará para tu constancia ni para las recompensas. Esto no se puede deshacer.',
  Abandon: 'Abandonar',
  'Anything worth remembering — the gym was packed, sleep was bad, a cue that clicked…':
    'Cualquier cosa que valga la pena recordar — el gimnasio estaba lleno, dormiste mal, una indicación que por fin entendiste…',
  'Add an exercise': 'Añadir un ejercicio',
  'Substitute exercise': 'Sustituir ejercicio',
  'Sets already logged for this slot will be cleared, and the substitution is recorded so your history stays honest.':
    'Las series ya registradas en este hueco se borrarán, y la sustitución queda registrada para que tu historial siga siendo honesto.',
  'Rest {seconds} seconds remaining': 'Quedan {seconds} segundos de descanso',
  'Exercise {number}': 'Ejercicio {number}',
  substituted: 'sustituido',
  '{sets} × {repMin}–{repMax} · rest {minutes} min · target {rir} RIR':
    '{sets} × {repMin}–{repMax} · descanso {minutes} min · objetivo {rir} RIR',
  'Reps so far': 'Repeticiones hasta ahora',
  'Last time': 'La vez pasada',
  'Reps left': 'Repeticiones restantes',
  '{done} total reps beats the {target} you managed last time at this load.':
    '{done} repeticiones totales superan las {target} que hiciste la vez pasada con esta carga.',
  '{count} more total reps at this load beats last session.':
    '{count} repeticiones totales más con esta carga superan la sesión pasada.',
  'Last time’s sets': 'Series de la vez pasada',
  'No previous session for this movement.': 'No hay sesión previa para este ejercicio.',
  '— why?': '— ¿por qué?',

  // --- The intensity challenge ---------------------------------------------
  'Challenge done': 'Reto completado',
  '+{coins} coins · +{xp} XP': '+{coins} monedas · +{xp} XP',
  '{outcome}: {headline}. Nothing lost — it was never part of the plan.':
    '{outcome}: {headline}. No perdiste nada — nunca fue parte del plan.',
  'Passed on': 'Lo dejaste pasar',
  'Called off': 'Lo cancelaste',
  Challenge: 'Reto',
  '{number} of {max} today': '{number} de {max} hoy',
  'Finish it: +{coins} coins, +{xp} XP': 'Complétalo: +{coins} monedas, +{xp} XP',
  'Take it': 'Acepto',
  'Not today': 'Hoy no',
  'How, and what the evidence actually says': 'Cómo, y qué dice realmente la evidencia',
  'Missing: {gap}': 'Falta: {gap}',
  Rule: 'Regla',
  '· confidence {confidence} · counts as {sets} of a hard set':
    '· confianza {confidence} · cuenta como {sets} de una serie dura',
  'Challenge accepted': 'Reto aceptado',
  'Couldn’t finish': 'No pude terminarlo',
  'No finisher today: {reason}': 'Hoy no hay remate: {reason}',

  // --- Logging a set --------------------------------------------------------
  Reps: 'Repeticiones',
  'Not loadable — nearest is {total} {units}': 'No se puede cargar — lo más cercano es {total} {units}',
  'Plates ›': 'Discos ›',
  'One side at a time — log each side as its own set':
    'Un lado a la vez — registra cada lado como su propia serie',
  'Reps in reserve': 'Repeticiones en reserva',
  '(not reported)': '(no reportado)',
  'Report effort': 'Reportar esfuerzo',
  '0 = could not do another rep. {min}–{max} is the target window for working sets.':
    '0 = no podías hacer otra repetición. {min}–{max} es la ventana objetivo para las series de trabajo.',
  'Warm-up set': 'Serie de calentamiento',
  'Copy last': 'Copiar la última',
  'Log set': 'Registrar serie',
  'Pain during this movement (0–10)': 'Dolor durante este ejercicio (0–10)',
  'Stop this movement': 'Detén este ejercicio',
  'Pain at {pain}/10 is your signal to stop this exercise today. FORGED will not prescribe more load here. If it is sharp, radiating, or lingers after training, see a physiotherapist or physician.':
    'Un dolor de {pain}/10 es tu señal para dejar este ejercicio por hoy. FORGED no va a recetar más carga aquí. Si es agudo, se irradia, o sigue después de entrenar, consulta a un fisioterapeuta o a un médico.',
  Technique: 'Técnica',
  Substitute: 'Sustituir',
  Remove: 'Quitar',
  'Edit set': 'Editar serie',

  // --- The plate calculator -------------------------------------------------
  'What is on the bar?': '¿Qué hay en la barra?',
  'Total on the bar': 'Total en la barra',
  '{bar} {units} bar + {perSide} {units} per side':
    'barra de {bar} {units} + {perSide} {units} por lado',
  'Plates per side': 'Discos por lado',
  Clear: 'Limpiar',
  'Use {total} {units}': 'Usar {total} {units}',
  'Bar weight and the plates your gym stocks are both editable in Profile → Settings.':
    'El peso de la barra y los discos que tiene tu gimnasio se editan en Perfil → Ajustes.',
  'Working set': 'Serie de trabajo',
  'Save changes': 'Guardar cambios',

  // --- Searching for a movement --------------------------------------------
  'Search exercises': 'Buscar ejercicios',
  'Suggested swaps': 'Cambios sugeridos',
  'also called “{alias}”': 'también llamado «{alias}»',
  'No exercises match “{query}”.': 'Ningún ejercicio coincide con «{query}».',
}
