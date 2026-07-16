import type { LucideIcon } from "lucide-react";
import {
  Bone, Brain, HeartPulse, Dumbbell, Footprints,
  Wind, Utensils, Type, Dna, Pencil, Microscope,
  Sprout, Stethoscope, Puzzle, Sparkles,
  SprayCan, Ambulance, Trash2, HardHat, TriangleAlert, MessagesSquare,
  ClipboardList, Compass, Siren, Phone, Zap, Droplets,
  BedDouble, Baby, PersonStanding, Scale, FileText, Bandage,
  Flame, TestTube, FlaskConical,
  Package, Gift, Trophy, GraduationCap, LifeBuoy, Star,
  Coins, Crown, ShieldCheck, Palette, Layers, Award,
  Medal, Target, Rocket, Book, Check, X, ThumbsUp,
  User, Shield, Gem,
} from "lucide-react";

// -------- Units --------
const UNIT_ICONS: Record<string, LucideIcon> = {
  os: Bone,
  organes: HeartPulse,
  prefixes: Type,
  suffixes: Pencil,
  radicaux: Sprout,
  pathologies: Stethoscope,
  "dea-hygiene": SprayCan,
  "dea-securite": HardHat,
  "dea-bilans": ClipboardList,
  "dea-urgences": Ambulance,
  "dea-gestes": Zap,
  "dea-anatomie": HeartPulse,
  "dea-patho": Stethoscope,
  "dea-trauma": Bandage,
  "dea-special": Baby,
  "dea-reglementation": Scale,
};

// -------- Lessons (id → icon) --------
const LESSON_ICONS: Record<string, LucideIcon> = {
  "os-1": Brain, "os-2": Bone, "os-3": Dumbbell, "os-4": Footprints,
  "org-1": HeartPulse, "org-2": Wind, "org-3": Utensils, "org-4": Brain,
  "pref-1": Type, "pref-2": Dna,
  "suff-1": Stethoscope, "suff-2": Microscope,
  "rad-1": Sprout, "rad-2": Dna,
  "path-1": HeartPulse, "path-2": Stethoscope, "path-3": Bone, "path-4": Puzzle,
};

// -------- Missions --------
const MISSION_ICONS: Record<string, LucideIcon> = {
  daily_xp_20: Zap,
  daily_lesson_1: Book,
  daily_perfect_1: Target,
  weekly_lessons_5: Rocket,
  weekly_streak_5: Flame,
};

// -------- Badges --------
const BADGE_ICONS: Record<string, LucideIcon> = {
  first_lesson: GraduationCap,
  streak_3: Flame, streak_7: Flame, streak_30: Trophy, streak_100: Crown,
  xp_100: Star, xp_1000: Sparkles, xp_10000: Award,
  level_10: Medal, level_25: Medal, level_50: Trophy,
  perfect_lesson: Target,
  anatomy_expert: Bone,
  vocab_master: Type,
  first_aid: Ambulance,
};

// -------- Shop item icons by code prefix / code --------
const SHOP_ICONS: Record<string, LucideIcon> = {
  av_stethoscope: Stethoscope, av_ambulance: Ambulance, av_heart: HeartPulse,
  av_brain: Brain, av_lungs: Wind, av_dna: Dna, av_syringe: Zap,
  av_microscope: Microscope, av_crown: Crown, av_dragon: Sparkles,
  fr_bronze: Medal, fr_silver: Medal, fr_gold: Trophy, fr_diamond: Gem,
  bg_hospital: ShieldCheck, bg_ecg: HeartPulse, bg_xray: Bone, bg_aurora: Sparkles,
  chest_small: Package, chest_big: Gift, chest_epic: Trophy,
  ti_novice: GraduationCap, ti_secouriste: LifeBuoy, ti_legend: Crown,
};

const SHOP_TYPE_FALLBACK: Record<string, LucideIcon> = {
  avatar: User, frame: Shield, background: Layers, badge: Award,
  booster: Zap, chest: Package, title: GraduationCap,
};

// -------- Components --------
type IconProps = { className?: string; strokeWidth?: number };

export function UnitIcon({ unitId, className, strokeWidth }: IconProps & { unitId: string }) {
  const Icon = UNIT_ICONS[unitId] ?? Book;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

export function LessonIcon({
  lessonId,
  unitId,
  className,
  strokeWidth,
}: IconProps & { lessonId: string; unitId?: string }) {
  const Icon =
    LESSON_ICONS[lessonId] ??
    (unitId ? UNIT_ICONS[unitId] : undefined) ??
    Book;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

export function MissionIcon({ code, className, strokeWidth }: IconProps & { code: string }) {
  const Icon = MISSION_ICONS[code] ?? Target;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

export function BadgeIcon({ code, className, strokeWidth }: IconProps & { code: string }) {
  const Icon = BADGE_ICONS[code] ?? Award;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

export function ShopItemIcon({
  code,
  type,
  className,
  strokeWidth,
}: IconProps & { code: string; type: string }) {
  const Icon = SHOP_ICONS[code] ?? SHOP_TYPE_FALLBACK[type] ?? Package;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

// Re-export commonly used icons for scoreboard/result screens
export {
  Trophy, ThumbsUp, Star, Check, X, Coins, Sparkles, Crown, Palette,
  Stethoscope, GraduationCap, HeartPulse, Ambulance,
};
