import type { Dict } from '@/i18n'

/**
 * Spanish for the shell surface. Keys are the exact English source strings.
 *
 * Small on purpose. The navigation words themselves (Today, Food, Train,
 * Progress, Forge, Profile) and the everyday buttons (Close, Cancel) live in
 * COMMON, because they appear on far more than the shell; what is left here is
 * the chrome the shell invents by itself.
 */
export const SHELL: Dict = {
  // Bottom navigation. Shown on the raised centre button when a session is
  // already open — "Reanudar" is what you resume with, not "Continuar", which
  // is the onboarding forward button.
  Resume: 'Reanudar',
  // Accessible name of the bottom navigation landmark.
  Primary: 'Principal',

  // Screen header.
  'Go back': 'Volver',

  // Shared component-kit fallbacks.
  Loading: 'Cargando',
  Confirm: 'Confirmar',

  // --- App shell -----------------------------------------------------------
  'FORGED': 'FORGED',
  'Opening the forge': 'Abriendo la fragua',
  'Skip to content': 'Saltar al contenido',
}
