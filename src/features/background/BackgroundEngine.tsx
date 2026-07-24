import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES (définition des données)
// ============================================

// Un thème est un décor avec un nom et son contenu
export interface BackgroundTheme {
  id: string;          // Identifiant unique (ex: "samu")
  name: string;        // Nom affiché (ex: "Centre de régulation SAMU")
  component: ReactNode; // Le contenu du décor
}

// Les propriétés du moteur
interface BackgroundEngineProps {
  theme: BackgroundTheme;       // Le thème à afficher
  intensity?: 'low' | 'medium' | 'high'; // Intensité du décor
  reducedMotion?: boolean;      // Désactiver les animations
  className?: string;           // Classes CSS supplémentaires
}

// ============================================
// MOTEUR PRINCIPAL
// ============================================

export function BackgroundEngine({
  theme,
  intensity = 'medium',
  reducedMotion = false,
  className = '',
}: BackgroundEngineProps) {
  // État pour contrôler l'opacité
  const [opacity, setOpacity] = useState(0.85);

  // Si l'intensité change, on ajuste l'opacité
  useEffect(() => {
    const opacities = { low: 0.6, medium: 0.85, high: 1 };
    setOpacity(opacities[intensity]);
  }, [intensity]);

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {/* Voile sombre (pour lire les textes) */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />
      
      {/* Le contenu du thème */}
      <div className="absolute inset-0 w-full h-full">
        {theme.component}
      </div>

      {/* Effet de vignette (assombrit les bords) */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-transparent via-transparent to-black/30" />
    </div>
  );
}