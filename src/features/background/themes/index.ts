import { SamuRegulationTheme } from './SamuRegulation';

// Tous les thèmes disponibles
export const THEMES = {
  samu: {
    id: 'samu',
    name: 'Centre de Régulation SAMU',
    component: SamuRegulationTheme(),
  },
  // Ici, on pourra ajouter d'autres thèmes plus tard :
  // anatomie: { id: 'anatomie', name: 'Anatomie', component: <AnatomieTheme /> },
  // urgence: { id: 'urgence', name: 'Urgences', component: <UrgenceTheme /> },
};

export type ThemeId = keyof typeof THEMES;

export function getTheme(id: ThemeId) {
  return THEMES[id];
}