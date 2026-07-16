import type { LucideIcon } from "lucide-react";
import unitIconsSheet from "@/assets/unit-icons-sheet.png";
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
  "dea-secu": HardHat,
  "dea-bilans": ClipboardList,
  "dea-detresses": Siren,
  "dea-gestes": Zap,
  "dea-anat": HeartPulse,
  "dea-patho": Stethoscope,
  "dea-trauma": Bandage,
  "dea-spe": Baby,
  "dea-regl": Scale,
};

// The unit artwork is supplied as one consistent MedLingo sprite sheet.  Keeping
// the crop coordinates here lets the curriculum use real artwork without
// duplicating image files for every unit.
const UNIT_ARTWORK: Record<string, { x: number; y: number }> = {
  prefixes: { x: 29, y: 20 },
  suffixes: { x: 363, y: 20 },
  radicaux: { x: 762, y: 20 },
  os: { x: 1074, y: 20 },
  organes: { x: 29, y: 259 },
  pathologies: { x: 443, y: 259 },
  "dea-hygiene": { x: 846, y: 259 },
  "dea-secu": { x: 1188, y: 259 },
  "dea-bilans": { x: 29, y: 490 },
  "dea-detresses": { x: 501, y: 490 },
  "dea-gestes": { x: 1007, y: 490 },
  "dea-anat": { x: 29, y: 700 },
  "dea-patho": { x: 416, y: 700 },
  "dea-trauma": { x: 1076, y: 700 },
  "dea-spe": { x: 224, y: 908 },
  "dea-regl": { x: 734, y: 908 },
};

const UNIT_ARTWORK_SCALE = 0.74;
const UNIT_ARTWORK_SHEET_SIZE = { width: 1536, height: 1024 };

// -------- Lessons (id → icon) --------
const LESSON_ICONS: Record<string, LucideIcon> = {
  "os-1": Brain, "os-2": Bone, "os-3": Dumbbell, "os-4": Footprints,
  "org-1": HeartPulse, "org-2": Wind, "org-3": Utensils, "org-4": Brain,
  "pref-1": Type, "pref-2": Dna,
  "suf-1": Stethoscope, "suf-2": Microscope,
  "rad-1": Sprout, "rad-2": Dna,
  "pat-1": HeartPulse, "pat-2": Stethoscope, "pat-3": Bone, "pat-4": Puzzle,
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

export function UnitArtwork({ unitId, className = "" }: { unitId: string; className?: string }) {
  const artwork = UNIT_ARTWORK[unitId];

  if (!artwork) {
    return (
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] ${className}`}>
        <UnitIcon unitId={unitId} className="h-7 w-7" strokeWidth={2.25} />
      </div>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`block h-14 w-14 shrink-0 rounded-2xl ${className}`}
      style={{
        backgroundImage: `url(${unitIconsSheet})`,
        backgroundPosition: `-${artwork.x * UNIT_ARTWORK_SCALE}px -${artwork.y * UNIT_ARTWORK_SCALE}px`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${UNIT_ARTWORK_SHEET_SIZE.width * UNIT_ARTWORK_SCALE}px ${UNIT_ARTWORK_SHEET_SIZE.height * UNIT_ARTWORK_SCALE}px`,
      }}
    />
  );
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
}: IconProps & { code: string; type?: string }) {
  const Icon = SHOP_ICONS[code] ?? (type ? SHOP_TYPE_FALLBACK[type] : undefined) ?? Package;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

// Re-export commonly used icons for scoreboard/result screens
export {
  Trophy, ThumbsUp, Star, Check, X, Coins, Sparkles, Crown, Palette,
  Stethoscope, GraduationCap, HeartPulse, Ambulance,
};
