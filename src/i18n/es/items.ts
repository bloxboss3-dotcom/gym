import type { Dict } from '@/i18n'

/**
 * The cosmetic catalogue: every item name and every line of lore.
 *
 * Its own namespace because it is the one surface where the English is not
 * written in the source of a screen. `CharacterCustomize` renders
 * `t(item.name)` and the inventory renders `t(item.lore)`, so the strings come
 * from `src/data/items.ts` at runtime — which is exactly why this went missing
 * for so long. The coverage script scans for literal `t('…')` calls and found
 * nothing to report, and the smoke leak check counts English function words,
 * which "Training Tunic" does not contain. Both were green over 300 English
 * strings a Spanish reader could see.
 *
 * Names are translated where they mean something and left alone where they are
 * proper nouns. Katana, Kabuto, Nodachi, Kusarigama, Iaido, Tekkō, Oni,
 * Kitsune, Haori, Tabi, Shinobi and Rōnin are the words used in Spanish too;
 * translating "Katana" to "Sable" would name a different object. Item names
 * that are English compounds — Emberbrand, Riftcleaver, Stormcall — do get
 * Spanish, because to an English reader they are descriptions rather than
 * borrowings, and leaving them would make the wardrobe read half-translated.
 *
 * The lore is one or two lines of dry, understated prose per item, and the
 * register matters more than the literal wording: several lines are jokes that
 * land on the last word, so they are translated to keep the joke rather than
 * the word order.
 */
export const ITEMS: Dict = {
  // --- Faces ----------------------------------------------------------------
  'Recruit': 'Recluta',
  'The face you started with. Nothing to prove yet.':
    'La cara con la que empezaste. Todavía no hay nada que demostrar.',
  'Scarred': 'Marcado',
  'Every mark is a session you did not skip.':
    'Cada marca es una sesión que no te saltaste.',
  'Ash Warpaint': 'Pintura de Ceniza',
  'Cold forge-ash, pressed on before the first set.':
    'Ceniza fría de fragua, aplicada antes de la primera serie.',
  'Veiled': 'Velado',
  'Silence under the visor. Only the count matters.':
    'Silencio bajo la visera. Solo importa la cuenta.',
  'Iron Mask': 'Máscara de Hierro',
  'Hammered from a bar that finally moved.':
    'Forjada a martillo con una barra que por fin se movió.',
  'Ember-Eyed': 'Ojos de Brasa',
  'They say the forge looks back.': 'Dicen que la fragua te devuelve la mirada.',
  'Saltworn': 'Curtido de Sal',
  'Weathered by early mornings by the water.':
    'Curtido por las madrugadas junto al agua.',
  'Jade Warpaint': 'Pintura de Jade',
  'Drawn on the morning of a lift that finally moved.':
    'Dibujada la mañana de un levantamiento que por fin se movió.',
  'Oni Mask': 'Máscara Oni',
  'Horned, snarling, and older than anyone who wears one.':
    'Con cuernos, gruñendo, y más vieja que cualquiera que la lleve.',
  'Kitsune Mask': 'Máscara Kitsune',
  'Nine tails are said to come with it. Only one has been confirmed.':
    'Dicen que vienen nueve colas con ella. Solo se ha confirmado una.',
  'Hollow Sigil': 'Sello Hueco',
  'The mark that appears on nobody, and then on someone.':
    'La marca que no le sale a nadie, y de pronto a alguien.',
  'Runebrand': 'Marca Rúnica',
  'Burnt in, one mark per plateau broken. Nobody has filled the second cheek.':
    'Grabada a fuego, una marca por cada estancamiento roto. Nadie ha llenado la segunda mejilla.',
  'Starlit': 'Mirada Estelar',
  'Whatever is behind the eyes, it is a long way behind them.':
    'Sea lo que sea lo que hay detrás de los ojos, está muy por detrás de ellos.',

  // --- Head / hair ----------------------------------------------------------
  'Bare Head': 'Cabeza Descubierta',
  'Nothing between you and the work.': 'Nada entre tú y el trabajo.',
  'Bound Hair': 'Pelo Recogido',
  'Tied back so it stays out of the third set.':
    'Atado para que no estorbe en la tercera serie.',
  'Warrior Topknot': 'Moño de Guerrero',
  'Practical. Old. Still works.': 'Práctico. Antiguo. Sigue funcionando.',
  'Ashen Hood': 'Capucha Cenicienta',
  'Kept for the walk home in the cold.': 'Guardada para volver a casa con frío.',
  'Open Helm': 'Yelmo Abierto',
  'Sight lines first, protection second.': 'Primero ver bien, después protegerse.',
  'Horned Helm': 'Yelmo Astado',
  'Weight you learn to carry.': 'Un peso que aprendes a llevar.',
  'Crowned Sallet': 'Celada Coronada',
  'Awarded, never bought.': 'Se concede, nunca se compra.',
  'Emberforged Crown': 'Corona Forjada en Brasa',
  'Cooled in a barrel that never stopped steaming.':
    'Enfriada en un barril que nunca dejó de humear.',
  'Rimeguard Helm': 'Yelmo Guardaescarcha',
  'Cold to the touch, even indoors.': 'Frío al tacto, incluso bajo techo.',
  'Rusted Horns': 'Cuernos Oxidados',
  'Older than the gym. Probably older than the town.':
    'Más viejos que el gimnasio. Probablemente más viejos que el pueblo.',
  'Spiked Mane': 'Melena Erizada',
  'Defies gravity, humidity, and most helmets.':
    'Desafía la gravedad, la humedad y casi todos los yelmos.',
  'High Ponytail': 'Coleta Alta',
  'Long enough to move a beat behind you.':
    'Lo bastante larga para moverse un instante después que tú.',
  'Kabuto': 'Kabuto',
  'A crescent on the brow, and everything below it hidden.':
    'Una media luna en la frente, y todo lo de debajo escondido.',
  'Ashen Halo': 'Halo Ceniciento',
  'It does not rest on anything. It simply stays.':
    'No se apoya en nada. Simplemente se queda.',
  'Drakeskull Helm': 'Yelmo Cráneo de Draco',
  'The skull was already this shape. The straps were added later.':
    'El cráneo ya tenía esta forma. Las correas se añadieron después.',
  'Astral Diadem': 'Diadema Astral',
  'It does not rest on the head. It keeps a respectful gap.':
    'No se apoya en la cabeza. Mantiene una distancia respetuosa.',
  'Crown of Nothing': 'Corona de Nada',
  'Seven pieces, no band, and it has never fallen off anyone.':
    'Siete piezas, ningún aro, y jamás se le ha caído a nadie.',

  // --- Body armour ----------------------------------------------------------
  'Training Tunic': 'Túnica de Entrenamiento',
  'Cheap cloth, honest sweat.': 'Tela barata, sudor honesto.',
  'Padded Jack': 'Jubón Acolchado',
  'Enough to blunt a bad rep.': 'Suficiente para amortiguar una repetición mala.',
  'Hardened Leather': 'Cuero Endurecido',
  'Boiled, shaped, and worn in.': 'Hervido, moldeado y ablandado con el uso.',
  'Scalemail': 'Cota de Escamas',
  'Overlapping plates, like weeks that stack.':
    'Placas superpuestas, como semanas que se acumulan.',
  'Brigandine': 'Brigantina',
  'Riveted where the load hits hardest.': 'Remachada donde más golpea la carga.',
  'Verdant Cuirass': 'Coraza Verdecida',
  'Copper gone green from years of steam.':
    'Cobre puesto verde por años de vapor.',
  'Forge Plate': 'Placa de Fragua',
  'Fitted to a frame that changed to earn it.':
    'Ajustada a un cuerpo que cambió para ganársela.',
  'Warden Plate': 'Placa de Guardián',
  'Standard issue for those who hold the line.':
    'Equipo de serie para quien aguanta la línea.',
  'Emberforged Plate': 'Placa Forjada en Brasa',
  'Still warm. Always warm.': 'Todavía tibia. Siempre tibia.',
  'Tidewrought Mail': 'Malla de Marea',
  'Rings that have been wet a thousand times and never rusted.':
    'Anillas mojadas mil veces que nunca se han oxidado.',
  'Rimeplate': 'Placa de Escarcha',
  'Heavy, silent, and cold enough to sting.':
    'Pesada, silenciosa y lo bastante fría para escocer.',
  'Shinobi Wrap': 'Vendaje Shinobi',
  'Wrapped so nothing catches and nothing rattles.':
    'Enrollado para que nada se enganche y nada suene.',
  'Sakura Haori': 'Haori Sakura',
  'Open at the front, and the sleeves never quite settle.':
    'Abierto por delante, y las mangas nunca terminan de posarse.',
  'Mecha Frame': 'Armazón Mecánico',
  'Something in it is always quietly running.':
    'Algo dentro está siempre funcionando en voz baja.',
  'Celestial Robe': 'Manto Celeste',
  'Cut from a night that had not happened yet.':
    'Cortado de una noche que aún no había ocurrido.',
  'Obsidian Warplate': 'Placa de Obsidiana',
  'Volcanic glass, and something behind it that has not gone out.':
    'Vidrio volcánico, y detrás algo que no se ha apagado.',
  'Solar Aegis': 'Égida Solar',
  'The disc on the chest turns whether or not you do.':
    'El disco del pecho gira, gires tú o no.',
  'The Unmade': 'lo Deshecho',
  'Eight pieces of a cuirass, none of them touching, all of them yours.':
    'Ocho piezas de una coraza, ninguna se toca, todas son tuyas.',

  // --- Hands ----------------------------------------------------------------
  'Linen Wraps': 'Vendas de Lino',
  'The first thing every recruit is handed.':
    'Lo primero que se le entrega a cada recluta.',
  'Grip Gloves': 'Guantes de Agarre',
  'Chalk-stained and loyal.': 'Manchados de magnesio y leales.',
  'Iron Bracers': 'Brazaletes de Hierro',
  'For the wrist that finally stopped folding.':
    'Para la muñeca que por fin dejó de doblarse.',
  'Scaled Mitts': 'Manoplas Escamadas',
  'Light enough to still feel the bar.':
    'Lo bastante ligeras para seguir notando la barra.',
  'Forge Gauntlets': 'Guanteletes de Fragua',
  'Made to hold heat.': 'Hechos para sostener el calor.',
  'Warden Gauntlets': 'Guanteletes de Guardián',
  'Heavier than they look. So is the bar.':
    'Más pesados de lo que parecen. La barra también.',
  'Emberforged Grips': 'Agarres Forjados en Brasa',
  'Coals sit in the knuckles and never go out.':
    'Hay brasas en los nudillos y nunca se apagan.',
  'Jadebound Wraps': 'Vendas de Jade',
  'Silk over chalk. Quietly expensive.':
    'Seda sobre magnesio. Caras sin decirlo.',
  'Tekkō Claws': 'Garras Tekkō',
  'Four blades along the knuckle, worn under the sleeve.':
    'Cuatro hojas sobre los nudillos, bajo la manga.',
  'Spiritbound Cuffs': 'Puños de Espíritu',
  'The light between the fingers is not reflected from anything.':
    'La luz entre los dedos no es el reflejo de nada.',
  'Riftgrasp': 'Garra de Grieta',
  'Split down the back of the hand, and the split is not empty.':
    'Abiertos por el dorso de la mano, y la abertura no está vacía.',
  'Titan Grips': 'Agarres de Titán',
  'Heavier than the bar. That is the joke, and it is not a joke.':
    'Más pesados que la barra. Ese es el chiste, y no es un chiste.',

  // --- Feet -----------------------------------------------------------------
  'Foot Wraps': 'Vendas de Pie',
  'Flat, grounded, honest.': 'Planas, firmes, honestas.',
  'Trail Boots': 'Botas de Sendero',
  'They have seen more roads than gyms.':
    'Han visto más caminos que gimnasios.',
  'Ashroad Runners': 'Zapatillas de Ceniza',
  'Built for the long, easy miles.':
    'Hechas para los kilómetros largos y suaves.',
  'Iron Greaves': 'Grebas de Hierro',
  'Shin protection for the heavy days.':
    'Protección para la espinilla en los días pesados.',
  'Warden Greaves': 'Grebas de Guardián',
  'Planted. Immovable.': 'Plantadas. Inamovibles.',
  'Gilded Sabatons': 'Escarpes Dorados',
  'Ceremonial, and still squat-tested.':
    'De ceremonia, y aun así probados en sentadilla.',
  'Emberforged Sabatons': 'Escarpes Forjados en Brasa',
  'They leave marks on the platform.': 'Dejan marcas en la plataforma.',
  'Flat Lifters': 'Suela Plana',
  'No cushion, no wobble, no excuses.':
    'Sin amortiguación, sin bamboleo, sin excusas.',
  'Tabi Boots': 'Botas Tabi',
  'Split toe, soft sole, no sound at all.':
    'Puntera partida, suela blanda, ningún ruido.',
  'Stormstep Greaves': 'Grebas de Paso Tormenta',
  'The air near them keeps flickering.':
    'El aire a su alrededor no deja de titilar.',
  'Magmatread': 'Pisada de Magma',
  'The platform under them is warm for an hour after you leave.':
    'La plataforma sigue tibia una hora después de que te vayas.',
  'Voidstride': 'Zancada del Vacío',
  'They hover about four millimetres. Enough that people check.':
    'Flotan unos cuatro milímetros. Lo justo para que la gente mire dos veces.',

  // --- Weapons --------------------------------------------------------------
  'Bare Hands': 'Manos Desnudas',
  'Where everyone begins.': 'Donde empieza todo el mundo.',
  'Training Staff': 'Bastón de Entrenamiento',
  'Balance before power.': 'Equilibrio antes que potencia.',
  'Shortsword': 'Espada Corta',
  'Simple, quick, unglamorous.': 'Simple, rápida, sin lucimiento.',
  'Hand Axe': 'Hacha de Mano',
  'One purpose, executed well.': 'Un solo propósito, bien ejecutado.',
  'Flanged Mace': 'Maza de Aletas',
  'Blunt honesty.': 'Honestidad contundente.',
  'Ash Spear': 'Lanza de Fresno',
  'Reach is its own kind of strength.':
    'El alcance es su propia clase de fuerza.',
  'Longsword': 'Espada Larga',
  'The reward for a hundred clean reps.':
    'La recompensa por cien repeticiones limpias.',
  'Warhammer': 'Martillo de Guerra',
  'Slow. Inevitable.': 'Lento. Inevitable.',
  'Halberd': 'Alabarda',
  'Demands two committed hands.': 'Exige dos manos comprometidas.',
  'Twin Fangs': 'Colmillos Gemelos',
  'Symmetry earned on both sides.': 'Simetría ganada por los dos lados.',
  'Greatsword': 'Mandoble',
  'You grew into this one.': 'Creciste hasta llegar a esta.',
  'Emberbrand': 'Tizón de Brasa',
  'Forged from the bar you swore you could not lift.':
    'Forjado con la barra que jurabas que no podías levantar.',
  'Tideglaive': 'Guja de Marea',
  'Balanced for reach. Patient in the same way water is.':
    'Equilibrada para el alcance. Paciente como lo es el agua.',
  'Rimefang': 'Colmillo de Escarcha',
  'Two edges that never seem to warm up.':
    'Dos filos que nunca parecen entrar en calor.',
  'Katana': 'Katana',
  'One edge, folded until arguing about it became a hobby.':
    'Un solo filo, plegado hasta que discutirlo se volvió una afición.',
  'Nodachi': 'Nodachi',
  'Longer than the person carrying it, which is the idea.':
    'Más largo que quien lo lleva, que es justo la idea.',
  'Kusarigama': 'Kusarigama',
  'A sickle, a chain, and a weight. In that order, usually.':
    'Una hoz, una cadena y un peso. Normalmente en ese orden.',
  'Spiritcutter': 'Corta-Espíritus',
  'It hums at the pitch of the room it is in.':
    'Zumba en el tono de la sala en la que está.',
  'The Quiet Edge': 'el Filo Callado',
  'No one agrees on what it looks like. Everyone agrees they have seen it.':
    'Nadie se pone de acuerdo en cómo es. Todos coinciden en que lo han visto.',
  'Riftcleaver': 'Hiende-Grietas',
  'The crack down the middle is not damage. It was made that way.':
    'La grieta del centro no es un daño. Se hizo así.',
  'Thunderpeal': 'Trueno Partido',
  'You hear it a half second before it lands, every single time.':
    'Lo oyes medio segundo antes de que caiga, siempre.',
  'First Light': 'Primera Luz',
  'There is a hilt. Everyone disagrees about the rest of it.':
    'Hay una empuñadura. Sobre el resto no hay acuerdo.',

  // --- Back / capes ---------------------------------------------------------
  'No Cloak': 'Sin Capa',
  'Nothing to catch the wind.': 'Nada que atrape el viento.',
  'Short Cloak': 'Capa Corta',
  'Practical warmth for cold mornings.':
    'Abrigo práctico para las mañanas frías.',
  'Tattered Cape': 'Capa Andrajosa',
  'Torn honestly, never for show.': 'Rota con honestidad, nunca por postureo.',
  'Warband Banner': 'Estandarte de Banda',
  'Carried by whoever showed up most.': 'Lo lleva quien más veces apareció.',
  'Warden Mantle': 'Manto de Guardián',
  'Weighted hem. It does not flap.': 'Dobladillo con peso. No ondea.',
  'Emberfall Mantle': 'Manto de Lluvia de Brasas',
  'Sheds sparks on every step.': 'Suelta chispas a cada paso.',
  'Jadeleaf Banner': 'Estandarte de Hoja de Jade',
  'Carried by whoever turned up in the rain.':
    'Lo lleva quien apareció bajo la lluvia.',
  'Long Scarf': 'Bufanda Larga',
  'Twice your height and permanently caught in a wind nobody else feels.':
    'El doble de tu altura y siempre atrapada en un viento que nadie más siente.',
  'Ashen Wings': 'Alas Cenicientas',
  'Folded most of the time. Mostly.': 'Plegadas casi siempre. Casi.',
  'Nine Tails': 'Nueve Colas',
  'Only three are usually visible. Nobody has counted the rest.':
    'Normalmente solo se ven tres. Nadie ha contado las demás.',
  'Starcloak': 'Capa Estelar',
  'Wearing it at night is how people lose an evening.':
    'Llevarla de noche es como la gente pierde una tarde entera.',
  'Auroral Mantle': 'Manto Auroral',
  'Six ribbons, none of them cloth, all of them moving.':
    'Seis cintas, ninguna de tela, todas en movimiento.',
  'Seraph Wings': 'Alas de Serafín',
  'Six wings. Two for flying, and nobody will say what the other four do.':
    'Seis alas. Dos para volar, y nadie dice para qué son las otras cuatro.',
  'Riftgate': 'Portal de Grieta',
  'It has been open the whole time. You only just turned around.':
    'Ha estado abierto todo el rato. Tú acabas de darte la vuelta.',

  // --- Auras ----------------------------------------------------------------
  'No Aura': 'Sin Aura',
  'Just you and the work.': 'Solo tú y el trabajo.',
  'Forge Dust': 'Polvo de Fragua',
  'Fine grit that never quite settles.':
    'Arenilla fina que nunca acaba de posarse.',
  'Low Smoke': 'Humo Bajo',
  'Quiet, dense, patient.': 'Callado, denso, paciente.',
  'Rising Embers': 'Brasas Ascendentes',
  'Heat that keeps climbing.': 'Calor que no deja de subir.',
  'Coldsteel': 'Acero Frío',
  'For those who never rush a set.':
    'Para quienes nunca aceleran una serie.',
  'Starfall': 'Lluvia de Estrellas',
  'Reserved for very long streaks.': 'Reservada para rachas muy largas.',
  'Tidepull': 'Tirón de Marea',
  'The air moves toward you, slowly.': 'El aire se mueve hacia ti, despacio.',
  'Falling Blossom': 'Flor que Cae',
  'Out of season, indoors, and constant.':
    'Fuera de temporada, bajo techo y sin parar.',
  'Stormcall': 'Llamada de Tormenta',
  'The hair goes first. Then everyone notices.':
    'Primero se eriza el pelo. Después lo nota todo el mundo.',
  'Voidbloom': 'Flor del Vacío',
  'Petals that fall upward and are gone before they arrive.':
    'Pétalos que caen hacia arriba y desaparecen antes de llegar.',
  'Umbral Shroud': 'Sudario Umbrío',
  'Black smoke off a pool that never dries. It rises even indoors.':
    'Humo negro de un charco que nunca se seca. Sube incluso bajo techo.',
  'Solar Flare': 'Fulguración Solar',
  'A corona that turns, and it turns faster on the heavy days.':
    'Una corona que gira, y gira más rápido en los días pesados.',
  'Eclipse': 'Eclipse',
  'The light goes round it rather than through. Nobody likes standing behind you.':
    'La luz lo rodea en vez de atravesarlo. A nadie le gusta ponerse detrás de ti.',

  // --- Companions -----------------------------------------------------------
  'No Companion': 'Sin Compañero',
  'Solo work.': 'Trabajo en solitario.',
  'Ember Wisp': 'Fuego Fatuo de Brasa',
  'It hovers near the bar and waits.':
    'Flota cerca de la barra y espera.',
  'Iron Raven': 'Cuervo de Hierro',
  'Counts your sets. Judges silently.':
    'Cuenta tus series. Juzga en silencio.',
  'Forge Hound': 'Sabueso de Fragua',
  'Sleeps through rest days, wakes for squats.':
    'Duerme los días de descanso, despierta con las sentadillas.',
  'Rime Owl': 'Búho de Escarcha',
  'Silent on the approach. Always is.':
    'Silencioso al acercarse. Siempre lo es.',
  'Spirit Fox': 'Zorro Espiritual',
  'Turns up on the heavy days and sits just out of reach.':
    'Aparece en los días pesados y se sienta justo fuera de alcance.',
  'Emberwing': 'Ala de Brasa',
  'Burns down to nothing every rest day and comes back annoyed.':
    'Se consume hasta la nada cada día de descanso y vuelve molesta.',
  'Cinderdrake': 'Draco de Ceniza',
  'Perches on the rack. Has opinions about your setup.':
    'Se posa en el rack. Tiene opiniones sobre cómo te colocas.',
  'The Watcher': 'el Observador',
  'It has counted every rep you have ever done, including the bad ones.':
    'Ha contado todas las repeticiones que has hecho, incluidas las malas.',

  // --- Titles ---------------------------------------------------------------
  'the Recruit': 'el Recluta',
  'Everyone earns this by starting.': 'Este se gana simplemente empezando.',
  'the Steady': 'el Constante',
  'Awarded for showing up twice in a row.':
    'Se concede por aparecer dos veces seguidas.',
  'the Unbroken': 'el Inquebrantable',
  'Four honest weeks.': 'Cuatro semanas honestas.',
  'Ironbound': 'Ferrado',
  'For those who love the heavy days.':
    'Para quienes aman los días pesados.',
  'Longstrider': 'Zancada Larga',
  'Miles that were not glamorous.': 'Kilómetros sin ningún glamur.',
  'Emberborn': 'Nacido de la Brasa',
  'The forge recognises you.': 'La fragua te reconoce.',
  'Warden of the Forge': 'Guardián de la Fragua',
  'You hold the line on the boring weeks.':
    'Aguantas la línea en las semanas aburridas.',
  'the Unyielding': 'el Indoblegable',
  'You deloaded on purpose and came back stronger.':
    'Descargaste a propósito y volviste más fuerte.',
  'Ashen Sovereign': 'Soberano Ceniciento',
  'Rare air.': 'Aire enrarecido.',
  'Forgemaster': 'Maestro Forjador',
  'The last title anyone earns.': 'El último título que se gana.',
  'Tidebound': 'Atado a la Marea',
  'For the ones who train on the days nobody would blame them for skipping.':
    'Para quienes entrenan los días en que nadie les culparía por faltar.',
  'Rimewalker': 'Caminante de Escarcha',
  'Cold mornings, warm bar.': 'Mañanas frías, barra caliente.',
  'the Rōnin': 'el Rōnin',
  'No school, no master, still turns up.':
    'Sin escuela, sin maestro, y aun así aparece.',
  'Nine-Tailed': 'Nueve Colas',
  'Counted once, by someone who then forgot the number.':
    'Contadas una vez, por alguien que después olvidó el número.',
  'the Nameless': 'el Sin Nombre',
  'Whoever earns this is not listed anywhere.':
    'Quien se gana esto no figura en ninguna lista.',
  'Worldbreaker': 'Rompemundos',
  'For a lift nobody in the room expected to go up.':
    'Por un levantamiento que nadie en la sala esperaba que subiera.',
  'the Eclipsed': 'el Eclipsado',
  'You trained through the week everything else went dark.':
    'Entrenaste durante la semana en que todo lo demás se apagó.',
  'the Unwritten': 'el No Escrito',
  'There is no record of this one. There is no record of you.':
    'No hay registro de este. No hay registro de ti.',

  // --- Poses ----------------------------------------------------------------
  'Ready Stance': 'Postura Lista',
  'Feet set, weight even.': 'Pies fijos, peso repartido.',
  'Guard': 'Guardia',
  'Hands up, chin down.': 'Manos arriba, barbilla abajo.',
  'At Rest': 'En Reposo',
  'Between sets, breathing.': 'Entre series, respirando.',
  'Heroic': 'Heroica',
  'Chest up. Earned it.': 'Pecho arriba. Te lo ganaste.',
  'Raised Blade': 'Hoja en Alto',
  'For the session that finally broke the plateau.':
    'Para la sesión que por fin rompió el estancamiento.',
  'Braced': 'En Tensión',
  'The stance you take before a set you respect.':
    'La postura que adoptas antes de una serie que respetas.',
  'Iaido': 'Iaido',
  'Hand on the hilt, nothing drawn yet.':
    'Mano en la empuñadura, todavía sin desenvainar.',
  'Ascendant': 'Ascendente',
  'Both feet still on the floor. Only just.':
    'Los dos pies aún en el suelo. Por poco.',
  'Titanfall': 'Caída de Titán',
  'Wide, low, and taking up the whole platform on purpose.':
    'Abierta, baja y ocupando toda la plataforma a propósito.',
  'Apotheosis': 'Apoteosis',
  'Arms open, head back, and not standing on anything at all.':
    'Brazos abiertos, cabeza atrás, y sin apoyarse en nada.',
}
