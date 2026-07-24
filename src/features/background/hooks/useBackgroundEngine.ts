import { useState, useEffect } from 'react';

export function useBackgroundEngine() {
  // État pour l'intensité du décor
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  
  // État pour les animations réduites
  const [reducedMotion, setReducedMotion] = useState(false);

  // Détecter si l'utilisateur préfère moins d'animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(prefersReducedMotion.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    prefersReducedMotion.addEventListener('change', handler);
    
    // Nettoyer l'écouteur quand le composant est détruit
    return () => prefersReducedMotion.removeEventListener('change', handler);
  }, []);

  return {
    intensity,
    setIntensity,
    reducedMotion,
  };
}