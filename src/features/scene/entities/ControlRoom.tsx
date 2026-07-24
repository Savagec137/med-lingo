import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function AnimatedScreen({ label, delay = 0 }: { label: string; delay?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setValue(Math.random() * 100), 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <motion.div
      className="absolute rounded bg-primary/10 border border-primary/20 p-1 text-[8px] font-mono overflow-hidden"
      style={{ width: '100%', height: '100%', animationDelay: `${delay}ms` }}
      animate={{ opacity: [0.7, 1, 0.7], transition: { duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' } }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-primary/60">{label}</span>
        <span className="text-primary">{Math.round(value)}</span>
      </div>
      <svg className="w-full h-[60%]" viewBox="0 0 100 20">
        <path d="M0,10 L20,10 L25,2 L30,18 L35,10 L50,10 L55,4 L60,16 L65,10 L80,10 L85,6 L90,14 L95,10 L100,10" stroke="oklch(0.78 0.15 210)" strokeWidth="1" fill="none" className="opacity-60" />
      </svg>
    </motion.div>
  );
}

export function ControlRoom() {
  return (
    <div className="relative w-full h-[300px] overflow-hidden rounded-2xl bg-gradient-to-b from-card/30 to-card/10">
      <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2">
        <AnimatedScreen label="ECG" delay={0} />
        <AnimatedScreen label="GPS" delay={500} />
        <AnimatedScreen label="RADAR" delay={1000} />
        <AnimatedScreen label="DISPATCH" delay={1500} />
        <AnimatedScreen label="STATS" delay={2000} />
        <AnimatedScreen label="ALERT" delay={2500} />
      </div>
      <motion.div
        className="absolute top-2 right-2 px-2 py-1 text-[8px] bg-destructive/20 text-destructive rounded-full border border-destructive/30"
        animate={{ opacity: [0.6, 1, 0.6], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
      >
        ● 3 appels en attente
      </motion.div>
    </div>
  );
}