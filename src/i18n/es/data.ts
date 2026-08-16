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

  // --- Evidence summaries and caveats --------------------------------------
  'Untrained lifters progress on relatively modest loads and volumes; progression should be gradual and systematic, with load increased once the prescribed repetitions can be completed with good form. The position stand suggests roughly 2–10% load increases when the target reps are exceeded, with smaller relative jumps for upper-body movements and larger ones for lower-body movements.':
    'Los levantadores sin experiencia progresan con cargas y volúmenes relativamente modestos; la progresión debe ser gradual y sistemática, subiendo la carga en cuanto se completan las repeticiones prescritas con buena técnica. El documento de posición sugiere subidas de carga de en torno al 2–10 % cuando se superan las repeticiones objetivo, con saltos relativos menores en los movimientos de tren superior y mayores en los de tren inferior.',
  'Train each major muscle group on 2–3 non-consecutive days per week, using 2–4 sets per exercise. About 8–12 repetitions per set suits strength and power for most adults; 10–15 works well for older or newly training adults; 15–20 targets muscular endurance. Allow at least 48 hours between sessions for the same muscle group.':
    'Entrena cada grupo muscular grande en 2–3 días no consecutivos por semana, con 2–4 series por ejercicio. Unas 8–12 repeticiones por serie sirven para fuerza y potencia en la mayoría de adultos; 10–15 va bien para adultos mayores o que empiezan; 15–20 apunta a la resistencia muscular. Deja al menos 48 horas entre sesiones del mismo grupo muscular.',
  'Across 49 studies and 1,863 participants, protein supplementation alongside resistance training produced small but significant additional gains in fat-free mass and 1RM strength. The meta-regression placed the breakpoint for further fat-free-mass benefit at about 1.6 g of protein per kg of body weight per day, with a confidence interval reaching roughly 2.2 g/kg/day.':
    'En 49 estudios y 1.863 participantes, suplementar proteína junto al entrenamiento de fuerza produjo ganancias adicionales pequeñas pero significativas de masa libre de grasa y de fuerza en 1RM. La metarregresión situó el punto de inflexión para más beneficio en masa libre de grasa en torno a 1,6 g de proteína por kg de peso corporal al día, con un intervalo de confianza que llega hasta unos 2,2 g/kg/día.',
  'For building and maintaining muscle, an overall daily intake of roughly 1.4–2.0 g/kg/day is sufficient for most exercising individuals, distributed across meals containing about 0.25 g/kg (roughly 20–40 g) of high-quality protein every 3–4 hours.':
    'Para construir y mantener músculo, una ingesta diaria total de unos 1,4–2,0 g/kg/día basta para la mayoría de personas que entrenan, repartida en comidas de unos 0,25 g/kg (aproximadamente 20–40 g) de proteína de calidad cada 3–4 horas.',
  'When training in an energy deficit and already lean, higher protein intakes help preserve lean mass. This is why FORGED nudges the recommended point toward the upper part of the 1.6–2.2 g/kg range for fat-loss and recomposition goals.':
    'Cuando entrenas en déficit energético y ya estás definido, las ingestas de proteína más altas ayudan a conservar la masa magra. Por eso FORGED empuja el punto recomendado hacia la parte alta del rango 1,6–2,2 g/kg en objetivos de pérdida de grasa y recomposición.',
  'The equation FORGED uses to estimate resting energy expenditure from weight, height, age and sex. Subsequent evidence analyses by the Academy of Nutrition and Dietetics found it the most reliable of the common predictive equations in both normal-weight and obese adults.':
    'La ecuación que usa FORGED para estimar el gasto energético en reposo a partir del peso, la estatura, la edad y el sexo. Análisis posteriores de la Academy of Nutrition and Dietetics la encontraron la más fiable de las ecuaciones predictivas habituales, tanto en adultos con normopeso como con obesidad.',
  'Body weight responds to a sustained energy imbalance, but the response is dynamic: energy expenditure falls as weight is lost, so a fixed calorie deficit does not produce a fixed, linear rate of loss. This is why FORGED calls its weekly projection an estimate and expects you to re-check it against real weight data.':
    'El peso corporal responde a un desequilibrio energético sostenido, pero la respuesta es dinámica: el gasto energético baja según se pierde peso, así que un déficit fijo de calorías no produce un ritmo de pérdida fijo ni lineal. Por eso FORGED llama estimación a su proyección semanal y espera que la contrastes con datos reales de peso.',
  'Losing weight at roughly 0.7% of body weight per week preserved lean mass and improved strength outcomes relative to a faster ~1.4%/week loss in trained athletes eating adequate protein and continuing to lift. This is the basis for the deficit cap in the FORGED rules file.':
    'Perder peso a un ritmo de en torno al 0,7 % del peso corporal por semana preservó la masa magra y mejoró los resultados de fuerza frente a una pérdida más rápida de ~1,4 %/semana en atletas entrenados que comían suficiente proteína y seguían levantando. Esta es la base del tope de déficit en el archivo de reglas de FORGED.',
  'Hypertrophy scales with weekly hard-set volume in a graded fashion, with roughly 10+ weekly sets per muscle outperforming lower volumes on average. That average is where FORGED\'s ~10-set reference point comes from.':
    'La hipertrofia escala con el volumen semanal de series duras de forma gradual, y unas 10+ series semanales por músculo superan de media a volúmenes menores. De esa media sale el punto de referencia de ~10 series de FORGED.',
  'Sets taken close to — but not necessarily to — momentary failure produce similar hypertrophy to sets taken to failure, while costing less fatigue. Stopping with roughly 1–3 reps in reserve is a reasonable working target for most sets.':
    'Las series llevadas cerca del fallo momentáneo —pero no necesariamente hasta él— producen una hipertrofia similar a las llevadas al fallo, con menos coste de fatiga. Parar con unas 1–3 repeticiones en reserva es un objetivo razonable para la mayoría de series.',
  'Training a muscle group at least twice a week produced greater hypertrophy than training it once a week in the pooled studies. Splitting the same weekly volume across two sessions is the cheapest structural change most people can make.':
    'Entrenar un grupo muscular al menos dos veces por semana produjo más hipertrofia que entrenarlo una vez en los estudios agrupados. Repartir el mismo volumen semanal en dos sesiones es el cambio estructural más barato que puede hacer la mayoría de la gente.',
  'Muscle growth was similar whether sets used heavy loads or light ones, provided the sets were taken close to failure. Maximal strength favoured the heavier loads. For hypertrophy this means the rep range is a preference, not a requirement — anywhere from roughly 6 to 30 reps works.':
    'El crecimiento muscular fue similar tanto con cargas altas como con cargas ligeras, siempre que las series se llevaran cerca del fallo. La fuerza máxima favoreció las cargas altas. Para hipertrofia esto significa que el rango de repeticiones es una preferencia, no un requisito: funciona desde unas 6 hasta 30 repeticiones.',
  'Three minutes of rest between sets produced greater strength and muscle thickness gains than one minute, in trained men doing an otherwise identical programme. Short rest cuts the reps you can do on later sets, and those lost reps are lost volume.':
    'Tres minutos de descanso entre series produjeron más ganancias de fuerza y grosor muscular que un minuto, en hombres entrenados haciendo un programa por lo demás idéntico. El descanso corto recorta las repeticiones que puedes hacer en las series posteriores, y esas repeticiones perdidas son volumen perdido.',
  'Reviewing drop sets, rest-pause, supersets and forced reps, the evidence for any of them being superior to ordinary straight sets is limited. Their clearest documented advantage is efficiency — comparable stimulus in less training time.':
    'Al revisar series descendentes, rest-pause, superseries y repeticiones forzadas, la evidencia de que alguna sea superior a las series normales es limitada. Su ventaja más clara documentada es la eficiencia: un estímulo comparable en menos tiempo de entrenamiento.',
  'A drop-set group reached hypertrophy comparable to a conventional group while spending roughly half the time under the bar. Drop sets bought volume per minute; they did not buy extra growth per set.':
    'Un grupo con series descendentes alcanzó una hipertrofia comparable a la de un grupo convencional pasando aproximadamente la mitad de tiempo bajo la barra. Las series descendentes compraron volumen por minuto; no compraron más crecimiento por serie.',
  'Training the hamstrings at long muscle lengths produced substantially more hypertrophy than matched work at short lengths. Where a movement loads the stretched position, that position is doing much of the work.':
    'Entrenar los isquiotibiales a longitudes musculares largas produjo bastante más hipertrofia que un trabajo equivalente a longitudes cortas. Cuando un movimiento carga la posición estirada, esa posición está haciendo gran parte del trabajo.',
  'Full range of motion generally matches or beats partial range, and partials performed in the stretched portion of the movement do about as well as full range — while partials in the shortened portion do worse. If you shorten a movement, shorten it at the top, never at the bottom.':
    'El rango de movimiento completo iguala o supera en general al parcial, y los parciales hechos en la parte estirada del movimiento rinden casi como el rango completo, mientras que los parciales en la parte acortada rinden peor. Si acortas un movimiento, acórtalo arriba, nunca abajo.',
  'A repetitions-in-reserve based RPE scale tracks proximity to failure well enough to guide autoregulation, and accuracy improves with training experience.':
    'Una escala de RPE basada en repeticiones en reserva refleja la cercanía al fallo lo bastante bien como para guiar la autorregulación, y la precisión mejora con la experiencia de entrenamiento.',
  'Adding endurance work to resistance training attenuated gains in strength, power and hypertrophy on average, and the interference scaled with the frequency and duration of the endurance work. Running produced more interference than cycling; explosive power was affected most.':
    'Añadir trabajo de resistencia al entrenamiento de fuerza atenuó de media las ganancias de fuerza, potencia e hipertrofia, y la interferencia escaló con la frecuencia y la duración del trabajo de resistencia. Correr produjo más interferencia que la bici; la potencia explosiva fue la más afectada.',
  'In the updated pooled analysis, concurrent training did not compromise gains in muscle size, and maximal-strength gains were largely preserved. Explosive-strength development showed the clearest attenuation, particularly with running-based endurance work and with sessions performed close together.':
    'En el análisis agrupado actualizado, el entrenamiento concurrente no comprometió las ganancias de tamaño muscular, y las de fuerza máxima se conservaron en gran medida. El desarrollo de fuerza explosiva mostró la atenuación más clara, sobre todo con resistencia basada en carrera y con sesiones muy juntas.',
  'Large weekly jumps in running distance were associated with certain running-related injuries in novice runners, but the association depended on injury type and on the runner. The evidence does not support a universal "never exceed 10%" law.':
    'Los saltos semanales grandes en distancia de carrera se asociaron con ciertas lesiones en corredores novatos, pero la asociación dependía del tipo de lesión y del corredor. La evidencia no respalda una ley universal de «nunca superes el 10 %».',
  'The review found limited and inconsistent evidence linking specific training-load changes to running injuries, and explicitly questioned rigid progression rules.':
    'La revisión encontró evidencia limitada e inconsistente que ligue cambios concretos de carga de entrenamiento con lesiones en carrera, y cuestionó explícitamente las reglas rígidas de progresión.',
  'Accumulated fatigue from sustained hard training can suppress performance, and planned reductions in load or volume are a normal part of managing it. Performance decline, elevated soreness, disturbed sleep and persistent joint discomfort are among the practical markers used to identify it.':
    'La fatiga acumulada de entrenar duro de forma sostenida puede hundir el rendimiento, y las reducciones planificadas de carga o volumen son parte normal de gestionarla. La caída de rendimiento, las agujetas elevadas, el sueño alterado y las molestias articulares persistentes están entre los marcadores prácticos que se usan para identificarla.',
  'Adults should do muscle-strengthening activities of at least moderate intensity involving all major muscle groups on 2 or more days a week, plus 150–300 minutes of moderate-intensity aerobic activity weekly.':
    'Los adultos deberían hacer actividades de fortalecimiento muscular de intensidad al menos moderada que impliquen a todos los grupos musculares grandes 2 o más días por semana, además de 150–300 minutos semanales de actividad aeróbica de intensidad moderada.',
  'Medical clearance before exercise is directed at people with known cardiovascular, metabolic or renal disease, or with signs and symptoms suggestive of it — chest discomfort, unusual breathlessness, dizziness or fainting among them.':
    'La autorización médica previa al ejercicio se dirige a personas con enfermedad cardiovascular, metabólica o renal conocida, o con signos y síntomas que la sugieran: molestias en el pecho, falta de aire poco habitual, mareo o desmayo entre ellos.',
  'Consensus guidance rather than a single experiment. It describes sensible defaults across populations, not the optimum for any individual.':
    'Guía de consenso, no un único experimento. Describe valores por defecto sensatos en distintas poblaciones, no el óptimo para nadie en concreto.',
  'Written as a public-health floor for apparently healthy adults, not a ceiling for people chasing maximum hypertrophy.':
    'Escrito como un suelo de salud pública para adultos aparentemente sanos, no como un techo para quien busca la máxima hipertrofia.',
  'The breakpoint is a population-level average with a wide confidence interval. It is the reason FORGED presents 1.6 g/kg as a baseline and 1.6–2.2 g/kg as a practical range — not as a mandate to eat 2.2.':
    'El punto de inflexión es una media poblacional con un intervalo de confianza amplio. Es la razón por la que FORGED presenta 1,6 g/kg como base y 1,6–2,2 g/kg como rango práctico, no como un mandato de comer 2,2.',
  'Higher intakes may be warranted during an energy deficit; the stand notes that most healthy adults tolerate these intakes without harm.':
    'Puede que ingestas más altas estén justificadas durante un déficit energético; el documento señala que la mayoría de adultos sanos las tolera sin problema.',
  'Derived from a lean, dieting athletic population; less relevant at a maintenance or surplus intake.':
    'Procede de una población atlética definida y en dieta; menos relevante con una ingesta de mantenimiento o superávit.',
  'Even the best predictive equation lands within 10% of measured resting expenditure for only about 80% of people, and it is blind to individual differences in non-exercise activity. Treat the calorie target as a starting point to adjust from your own weight trend, not as a measurement.':
    'Incluso la mejor ecuación predictiva acierta dentro de un 10 % del gasto en reposo medido solo en un 80 % de las personas, y es ciega a las diferencias individuales de actividad no deportiva. Trata el objetivo de calorías como un punto de partida que ajustar con tu propia tendencia de peso, no como una medición.',
  'A review of energy-balance physiology rather than a trial of any particular diet. It does not endorse a specific calorie target for anyone.':
    'Una revisión de la fisiología del balance energético, no un ensayo de ninguna dieta concreta. No respalda un objetivo calórico específico para nadie.',
  'Small sample of elite athletes. It supports a slower loss rate as the safer default; it does not mean a faster rate is harmful for everyone.':
    'Muestra pequeña de atletas de élite. Apoya un ritmo de pérdida más lento como opción por defecto más segura; no significa que un ritmo más rápido sea dañino para todo el mundo.',
  'A group average across mostly short studies. Individual responses vary widely, recoverable volume is personal, and the curve does not keep climbing forever — more is not automatically better.':
    'Una media de grupo en estudios mayoritariamente cortos. Las respuestas individuales varían mucho, el volumen recuperable es personal y la curva no sube para siempre: más no es automáticamente mejor.',
  'Estimating your own reps in reserve is a learned skill; novices tend to underestimate how close to failure they really are.':
    'Estimar tus propias repeticiones en reserva es una habilidad que se aprende; los novatos tienden a subestimar lo cerca del fallo que están de verdad.',
  'Weekly volume was not equated in every included study, so part of the effect may be volume rather than frequency itself. There is no evidence that going beyond twice weekly adds much once volume is matched.':
    'El volumen semanal no se igualó en todos los estudios incluidos, así que parte del efecto puede ser volumen y no frecuencia. No hay evidencia de que pasar de dos veces por semana aporte mucho una vez igualado el volumen.',
  'Light-load sets have to be genuinely hard to count. A comfortable set of 25 is not equivalent to a hard set of 25.':
    'Las series con carga ligera tienen que ser realmente duras para contar. Una serie cómoda de 25 no equivale a una serie dura de 25.',
  'One study in trained men on a fixed programme. It argues against rushing compound sets; it does not mean every isolation set needs three minutes.':
    'Un estudio en hombres entrenados con un programa fijo. Argumenta en contra de correr con las series de básicos; no significa que cada serie de aislamiento necesite tres minutos.',
  'A narrative-leaning review of a small and heterogeneous literature. "Not proven superior" is not the same as "useless", and the fatigue cost of these techniques is real.':
    'Una revisión de corte narrativo sobre una literatura pequeña y heterogénea. «No demostrado superior» no es lo mismo que «inútil», y el coste de fatiga de estas técnicas es real.',
  'Small, short, and in a single movement. Treat it as evidence for time efficiency, not for superiority.':
    'Pequeño, corto y en un solo movimiento. Tómalo como evidencia de eficiencia temporal, no de superioridad.',
  'One muscle group, one movement. The direction of the effect is consistent across the wider range-of-motion literature, but the size of it is not settled.':
    'Un grupo muscular, un movimiento. La dirección del efecto es consistente con la literatura más amplia sobre rango de movimiento, pero su tamaño no está cerrado.',
  'Studies differ in how they defined "full" range, and most are short. The practical rule — never cut the stretch — is better supported than any precise number.':
    'Los estudios difieren en cómo definieron el rango «completo», y la mayoría son cortos. La regla práctica —nunca recortes el estiramiento— está mejor respaldada que cualquier número concreto.',
  'Validation was in resistance-trained lifters; expect noisier self-ratings when you are new.':
    'La validación fue en levantadores entrenados; espera valoraciones propias más ruidosas cuando empiezas.',
  'Older analysis with heterogeneous protocols. It supports spacing hard running away from hard lower-body lifting, not avoiding running.':
    'Análisis más antiguo con protocolos heterogéneos. Apoya separar la carrera dura del trabajo duro de tren inferior, no dejar de correr.',
  'This is the more current and more optimistic read of the interference effect, and it is why FORGED manages *scheduling* rather than telling muscle-first users to stop running.':
    'Esta es la lectura más actual y más optimista del efecto de interferencia, y es la razón por la que FORGED gestiona la *planificación* en vez de decirle a quien prioriza el músculo que deje de correr.',
  'Observational. FORGED therefore caps weekly increases based on your experience, recent completion rate, RPE and pain rather than applying one fixed percentage to everybody.':
    'Observacional. Por eso FORGED limita los aumentos semanales según tu experiencia, tu tasa de cumplimiento reciente, el RPE y el dolor, en vez de aplicar un porcentaje fijo a todo el mundo.',
  'Absence of strong evidence is not evidence that big jumps are safe — it argues for individualised caution.':
    'La ausencia de evidencia fuerte no es evidencia de que los saltos grandes sean seguros: es un argumento para la cautela individualizada.',
  'There is no validated consumer test for overreaching. FORGED treats its deload signals as a prompt to reflect, not a diagnosis.':
    'No existe un test de consumo validado para el sobreentrenamiento. FORGED trata sus señales de descarga como una invitación a reflexionar, no como un diagnóstico.',
  'FORGED is not a screening tool. If any of those symptoms appear, stop training and contact a clinician.':
    'FORGED no es una herramienta de cribado. Si aparece alguno de esos síntomas, deja de entrenar y acude a un profesional sanitario.',
  'Caveat:': 'Matiz:',

  // --- Quests and achievements ---------------------------------------------
  'Read the Forge': 'Lee la Fragua',
  'Feed the Fire': 'Alimenta el fuego',
  'Honest Steel': 'Acero honesto',
  'Hold the Line': 'Mantén la línea',
  'The Long Road': 'El camino largo',
  'Provisioned': 'Aprovisionado',
  'Bank the Heat': 'Guarda el calor',
  'Never Cold': 'Nunca frío',
  'First Heat': 'Primer fuego',
  'Ten Sessions Deep': 'Diez sesiones dentro',
  'Tempered': 'Templado',
  'Unbroken Month': 'Mes sin romper',
  'Boots On': 'Botas puestas',
  'Fifty Kilometres': 'Cincuenta kilómetros',
  'Well Provisioned': 'Bien aprovisionado',
  'Cooled Steel': 'Acero enfriado',
  'New Ceiling': 'Nuevo techo',
  'Faster Than Before': 'Más rápido que antes',
  'Warband Rank': 'Rango de la hueste',
  'Log today’s readiness check-in.': 'Registra tu control de hoy.',
  'Reach your daily protein target.': 'Alcanza tu objetivo diario de proteína.',
  'Log reps in reserve on at least 6 working sets today.':
    'Registra las repeticiones en reserva en al menos 6 series de trabajo hoy.',
  'Complete 3 planned training sessions this week.':
    'Completa 3 sesiones de entrenamiento planificadas esta semana.',
  'Complete 2 runs this week.': 'Completa 2 carreras esta semana.',
  'Hit your protein target on 5 days this week.':
    'Llega a tu objetivo de proteína en 5 días de esta semana.',
  'Take your prescribed recovery day. Rest is training.':
    'Tómate tu día de recuperación prescrito. Descansar es entrenar.',
  'Be active — lift, run, or recover on purpose — on 5 days.':
    'Muévete —pesas, carrera o recuperación a propósito— en 5 días.',
  'Complete your first FORGED session.': 'Completa tu primera sesión de FORGED.',
  'Complete 10 training sessions.': 'Completa 10 sesiones de entrenamiento.',
  'Complete 30 training sessions.': 'Completa 30 sesiones de entrenamiento.',
  'Keep a consistency score above 80% for four weeks.':
    'Mantén una puntuación de constancia por encima del 80 % durante cuatro semanas.',
  'Log your first run.': 'Registra tu primera carrera.',
  'Accumulate 50 km of running.': 'Acumula 50 km de carrera.',
  'Hit your protein target 5 days in one week.':
    'Llega a tu objetivo de proteína 5 días en una semana.',
  'Complete a deload week. Backing off on purpose is training.':
    'Completa una semana de descarga. Bajar el pie a propósito es entrenar.',
  'Set a personal record on any lift.': 'Consigue un récord personal en cualquier ejercicio.',
  'Improve a running benchmark.': 'Mejora una marca de referencia en carrera.',
  'Reach level 10.': 'Llega al nivel 10.',
  'Log reps in reserve on 100 working sets.':
    'Registra las repeticiones en reserva en 100 series de trabajo.',

  // --- Deload signal labels -------------------------------------------------
  'Empty': 'Vacío',
  'Sessions harder than prescribed': 'Sesiones más duras de lo prescrito',
  'Broad performance decline, elevated soreness and low readiness after a long build.':
    'Caída general del rendimiento, agujetas elevadas y poca disposición tras un bloque largo.',
}
