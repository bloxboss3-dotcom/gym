import type { Dict } from '@/i18n'

/** Spanish for the profile surface. Keys are the exact English source strings. */
export const PROFILE: Dict = {
  // --- Profile -------------------------------------------------------------
  'Storage is not persistent': 'El almacenamiento no es persistente',
  'FORGED could not open IndexedDB in this browser, so your data will not survive a reload. Export a backup before you close the tab, and try a normal (non-private) window.':
    'FORGED no pudo abrir IndexedDB en este navegador, así que tus datos no sobrevivirán a una recarga. Exporta una copia antes de cerrar la pestaña y prueba en una ventana normal (no privada).',
  'Edit profile': 'Editar perfil',
  'Training': 'Entrenamiento',
  'Priority': 'Prioridad',
  'Session length': 'Duración de la sesión',
  'Weekly running': 'Carrera semanal',
  'Protein target': 'Objetivo de proteína',
  'Rebuild my program from this profile': 'Reconstruir mi programa con este perfil',
  'Limitations': 'Limitaciones',
  'Settings': 'Ajustes',
  'Language · Idioma': 'Idioma · Language',
  'Default increment': 'Incremento por defecto',
  'Barbell weight': 'Peso de la barra',
  'Plates your gym has': 'Discos que hay en tu gimnasio',
  'Default rest between sets': 'Descanso por defecto entre series',
  'Default rest': 'Descanso por defecto',
  'Reduce motion': 'Reducir movimiento',
  'Haptics': 'Vibración',
  'Data': 'Datos',
  'Backup & restore': 'Copia de seguridad y restauración',
  'Science & safety': 'Ciencia y seguridad',
  'What FORGED can optimise, what it can only estimate, and the sources behind every rule.':
    'Lo que FORGED puede optimizar, lo que solo puede estimar y las fuentes detrás de cada regla.',
  'Demo mode': 'Modo demostración',
  'Loads six weeks of realistic training — completed sessions, a stalled lift, a deload trigger, protein adherence, running improvement and earned gear — so you can see every screen with real data. This replaces whatever is currently stored, so export a backup first if you care about it.':
    'Carga seis semanas de entrenamiento realista: sesiones completadas, un ejercicio estancado, una descarga activada, adherencia a la proteína, mejora en carrera y equipo ganado, para que veas cada pantalla con datos reales. Esto reemplaza lo que tengas guardado, así que exporta una copia antes si te importa.',
  'Load demo data': 'Cargar datos de demostración',
  'Erase everything': 'Borrar todo',
  'Demo data is currently loaded': 'Ahora mismo hay datos de demostración cargados',
  'Install FORGED on your phone': 'Instalar FORGED en tu teléfono',
  'iPhone / iPad:': 'iPhone / iPad:',
  'Android:': 'Android:',
  'After the first load, everything works with no network at all — the app shell is cached and all your data lives on the device.':
    'Después de la primera carga todo funciona sin red: la aplicación queda en caché y todos tus datos viven en el dispositivo.',
  'Privacy': 'Privacidad',
  'FORGED has no account, no server, and no analytics. Everything you enter is stored in your browser\'s IndexedDB on this device only. Nothing is transmitted anywhere.':
    'FORGED no tiene cuenta, ni servidor, ni analíticas. Todo lo que introduces se guarda en el IndexedDB de tu navegador, solo en este dispositivo. No se transmite nada a ninguna parte.',
  'That also means: if you clear your browser data, delete the app, or lose the device, the data is gone. Export a backup periodically.':
    'Eso también significa que si borras los datos del navegador, eliminas la aplicación o pierdes el dispositivo, los datos desaparecen. Exporta una copia de vez en cuando.',
  'The only data FORGED collects is what it needs to make training decisions. There is no email, no phone number, no location, and no advertising identifier.':
    'Los únicos datos que FORGED recoge son los que necesita para decidir tu entrenamiento. No hay correo, ni teléfono, ni ubicación, ni identificador publicitario.',
  'FORGED is educational fitness software, not medical advice, diagnosis or treatment. Chest pain, dizziness, fainting, unusual breathlessness or worsening joint pain mean stop training and contact a clinician.':
    'FORGED es software educativo de fitness, no consejo médico, diagnóstico ni tratamiento. Dolor en el pecho, mareo, desmayo, falta de aire poco habitual o dolor articular que empeora significan parar de entrenar y acudir a un profesional sanitario.',
  'Rebuild your program?': '¿Reconstruir tu programa?',
  'A fresh program is generated from your current profile and becomes active. Your existing custom programs are kept, and your training history and recommendations are untouched.':
    'Se genera un programa nuevo a partir de tu perfil actual y se activa. Tus programas personalizados se conservan, y tu historial y tus recomendaciones no se tocan.',
  'Rebuild': 'Reconstruir',
  'Replace your data with the demo?': '¿Reemplazar tus datos por la demostración?',
  'Everything currently stored — sessions, runs, protein, inventory and profile — is replaced by the demo dataset. Export a backup first if you want it back.':
    'Todo lo guardado —sesiones, carreras, proteína, inventario y perfil— se reemplaza por el conjunto de demostración. Exporta una copia antes si quieres recuperarlo.',
  'Load demo': 'Cargar demostración',
  'Erase everything?': '¿Borrar todo?',
  'This permanently deletes your profile, every session, run, protein entry, item and reward from this device. It cannot be undone and there is no server copy.':
    'Esto borra para siempre tu perfil y todas las sesiones, carreras, registros de proteína, objetos y recompensas de este dispositivo. No se puede deshacer y no hay copia en ningún servidor.',
  'Name': 'Nombre',
  'Height (cm)': 'Estatura (cm)',
  'Experience': 'Experiencia',
  'Goal': 'Objetivo',

  'FORGED watches six signals ({count} firing at once triggers a suggestion): broad performance decline, elevated soreness, low readiness, persistent joint discomfort, repeated sessions harder than prescribed, and {weeks}+ consecutive weeks without a back-off.':
    'FORGED vigila seis señales ({count} activas a la vez disparan una sugerencia): caída general del rendimiento, agujetas elevadas, poca disposición, molestia articular persistente, sesiones repetidas más duras de lo prescrito y {weeks}+ semanas seguidas sin bajar el pie.',
  'A deload week keeps the movements and cuts roughly {volume}% of the sets and {load}% of the load. It counts as a completed week for your consistency and pays out rewards like any other — because it is training, not time off.':
    'Una semana de descarga mantiene los ejercicios y recorta en torno al {volume} % de las series y al {load} % de la carga. Cuenta como semana completada para tu constancia y paga recompensas como cualquier otra, porque es entrenar, no descansar.',
}
