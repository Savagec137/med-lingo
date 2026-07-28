import type { LucideIcon } from "lucide-react";
import unitIconsSheet from "@/assets/unit-icons-sheet.webp";
import {
  ROADMAP_BLOCK_VISUALS,
  ROADMAP_PARCOURS_VISUALS,
  type RoadmapIconName,
  type RoadmapPalette,
} from "@/lib/roadmap-visuals";
import {
  Activity,
  Bone,
  Brain,
  BriefcaseMedical,
  BookOpen,
  CarFront,
  HeartPulse,
  Dumbbell,
  Eye,
  Footprints,
  Wind,
  Utensils,
  Type,
  Dna,
  Pencil,
  Microscope,
  Sprout,
  Stethoscope,
  Puzzle,
  Sparkles,
  SprayCan,
  Ambulance,
  Trash2,
  HardHat,
  TriangleAlert,
  MessagesSquare,
  ClipboardList,
  Compass,
  Siren,
  Phone,
  Zap,
  Droplets,
  BedDouble,
  Baby,
  PersonStanding,
  HandHeart,
  HeartHandshake,
  Navigation,
  ShieldAlert,
  ShieldPlus,
  UsersRound,
  Scale,
  FileText,
  Bandage,
  Flame,
  TestTube,
  FlaskConical,
  Package,
  Gift,
  Trophy,
  GraduationCap,
  LifeBuoy,
  Star,
  Coins,
  Crown,
  ShieldCheck,
  Palette,
  Layers,
  Award,
  Medal,
  Target,
  Rocket,
  Book,
  Check,
  X,
  ThumbsUp,
  User,
  Shield,
  Gem,
  Lock,
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
  "b1-u1-communication": MessagesSquare,
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

const ROADMAP_ICONS: Record<RoadmapIconName, LucideIcon> = {
  activity: Activity,
  ambulance: Ambulance,
  baby: Baby,
  bandage: Bandage,
  bone: Bone,
  "book-open": BookOpen,
  brain: Brain,
  "briefcase-medical": BriefcaseMedical,
  "car-front": CarFront,
  "clipboard-list": ClipboardList,
  dna: Dna,
  droplets: Droplets,
  eye: Eye,
  flame: Flame,
  flask: FlaskConical,
  "hand-heart": HandHeart,
  "hard-hat": HardHat,
  "heart-handshake": HeartHandshake,
  "heart-pulse": HeartPulse,
  messages: MessagesSquare,
  microscope: Microscope,
  navigation: Navigation,
  "person-standing": PersonStanding,
  phone: Phone,
  scale: Scale,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  "shield-plus": ShieldPlus,
  siren: Siren,
  "spray-can": SprayCan,
  stethoscope: Stethoscope,
  "test-tube": TestTube,
  trophy: Trophy,
  type: Type,
  "users-round": UsersRound,
  utensils: Utensils,
  wind: Wind,
  zap: Zap,
};

const ROADMAP_PALETTE_CLASSES: Record<
  RoadmapPalette,
  { frame: string; icon: string; badge: string }
> = {
  emerald: {
    frame:
      "border-emerald-300/40 bg-gradient-to-br from-emerald-300/30 via-emerald-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(52,211,153,0.14)]",
    icon: "text-emerald-200",
    badge: "border-emerald-300/40 bg-emerald-400 text-emerald-950",
  },
  cyan: {
    frame:
      "border-cyan-300/40 bg-gradient-to-br from-cyan-300/30 via-cyan-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(34,211,238,0.14)]",
    icon: "text-cyan-200",
    badge: "border-cyan-300/40 bg-cyan-400 text-cyan-950",
  },
  violet: {
    frame:
      "border-violet-300/40 bg-gradient-to-br from-violet-300/30 via-violet-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(167,139,250,0.14)]",
    icon: "text-violet-200",
    badge: "border-violet-300/40 bg-violet-400 text-violet-950",
  },
  teal: {
    frame:
      "border-teal-300/40 bg-gradient-to-br from-teal-300/30 via-teal-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(45,212,191,0.14)]",
    icon: "text-teal-200",
    badge: "border-teal-300/40 bg-teal-400 text-teal-950",
  },
  amber: {
    frame:
      "border-amber-300/40 bg-gradient-to-br from-amber-300/30 via-amber-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(251,191,36,0.14)]",
    icon: "text-amber-200",
    badge: "border-amber-300/40 bg-amber-400 text-amber-950",
  },
  red: {
    frame:
      "border-red-300/40 bg-gradient-to-br from-red-300/30 via-red-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(248,113,113,0.14)]",
    icon: "text-red-200",
    badge: "border-red-300/40 bg-red-400 text-red-950",
  },
  fuchsia: {
    frame:
      "border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-300/30 via-fuchsia-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(232,121,249,0.14)]",
    icon: "text-fuchsia-200",
    badge: "border-fuchsia-300/40 bg-fuchsia-400 text-fuchsia-950",
  },
  orange: {
    frame:
      "border-orange-300/40 bg-gradient-to-br from-orange-300/30 via-orange-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(251,146,60,0.14)]",
    icon: "text-orange-200",
    badge: "border-orange-300/40 bg-orange-400 text-orange-950",
  },
  pink: {
    frame:
      "border-pink-300/40 bg-gradient-to-br from-pink-300/30 via-pink-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(244,114,182,0.14)]",
    icon: "text-pink-200",
    badge: "border-pink-300/40 bg-pink-400 text-pink-950",
  },
  blue: {
    frame:
      "border-blue-300/40 bg-gradient-to-br from-blue-300/30 via-blue-500/15 to-slate-950/70 shadow-[0_0_28px_rgba(96,165,250,0.14)]",
    icon: "text-blue-200",
    badge: "border-blue-300/40 bg-blue-400 text-blue-950",
  },
};

// -------- Lessons (id → icon) --------
const LESSON_ICONS: Record<string, LucideIcon> = {
  "b1-u1-l1": MessagesSquare,
  "os-1": Brain,
  "os-2": Bone,
  "os-3": Dumbbell,
  "os-4": Footprints,
  "org-1": HeartPulse,
  "org-2": Wind,
  "org-3": Utensils,
  "org-4": Brain,
  "pref-1": Type,
  "pref-2": Dna,
  "suf-1": Stethoscope,
  "suf-2": Microscope,
  "rad-1": Sprout,
  "rad-2": Dna,
  "pat-1": HeartPulse,
  "pat-2": Stethoscope,
  "pat-3": Bone,
  "pat-4": Puzzle,
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
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Trophy,
  streak_100: Crown,
  xp_100: Star,
  xp_1000: Sparkles,
  xp_10000: Award,
  level_10: Medal,
  level_25: Medal,
  level_50: Trophy,
  perfect_lesson: Target,
  anatomy_expert: Bone,
  vocab_master: Type,
  first_aid: Ambulance,
};

// -------- Shop item icons by code prefix / code --------
const SHOP_ICONS: Record<string, LucideIcon> = {
  av_stethoscope: Stethoscope,
  av_ambulance: Ambulance,
  av_heart: HeartPulse,
  av_brain: Brain,
  av_lungs: Wind,
  av_dna: Dna,
  av_syringe: Zap,
  av_microscope: Microscope,
  av_crown: Crown,
  av_dragon: Sparkles,
  fr_bronze: Medal,
  fr_silver: Medal,
  fr_gold: Trophy,
  fr_diamond: Gem,
  bg_hospital: ShieldCheck,
  bg_ecg: HeartPulse,
  bg_xray: Bone,
  bg_aurora: Sparkles,
  chest_small: Package,
  chest_big: Gift,
  chest_epic: Trophy,
  ti_novice: GraduationCap,
  ti_secouriste: LifeBuoy,
  ti_legend: Crown,
};

const SHOP_TYPE_FALLBACK: Record<string, LucideIcon> = {
  avatar: User,
  frame: Shield,
  background: Layers,
  badge: Award,
  booster: Zap,
  chest: Package,
  title: GraduationCap,
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
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] ${className}`}
      >
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

export function RoadmapBlockArtwork({ blocId, order }: { blocId: string; order: number }) {
  const visual = ROADMAP_BLOCK_VISUALS[blocId] ?? {
    icon: "book-open" as const,
    palette: "cyan" as const,
  };
  const Icon = ROADMAP_ICONS[visual.icon];
  const palette = ROADMAP_PALETTE_CLASSES[visual.palette];

  return (
    <div
      aria-hidden="true"
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${palette.frame}`}
    >
      <div className="absolute inset-x-2 top-0 h-px bg-white/60" />
      <Icon className={`relative z-10 h-6 w-6 ${palette.icon}`} strokeWidth={2.2} />
      <span
        className={`absolute -bottom-px -right-px flex h-5 min-w-5 items-center justify-center rounded-tl-lg border px-1 text-[10px] font-black ${palette.badge}`}
      >
        {order}
      </span>
    </div>
  );
}

export function RoadmapParcoursArtwork({
  parcoursId,
  blocId,
  locked = false,
}: {
  parcoursId: string;
  blocId: string;
  locked?: boolean;
}) {
  const blockVisual = ROADMAP_BLOCK_VISUALS[blocId] ?? {
    icon: "book-open" as const,
    palette: "cyan" as const,
  };
  const iconName = ROADMAP_PARCOURS_VISUALS[parcoursId] ?? blockVisual.icon;
  const Icon = ROADMAP_ICONS[iconName];
  const palette = ROADMAP_PALETTE_CLASSES[blockVisual.palette];

  return (
    <div
      aria-hidden="true"
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-2xl border transition-opacity ${palette.frame} ${
        locked ? "opacity-75 saturate-75" : ""
      }`}
    >
      <div className="absolute inset-1 rounded-xl border border-white/10 bg-white/5" />
      <Icon className={`relative z-10 h-7 w-7 ${palette.icon}`} strokeWidth={2.15} />
      {locked && (
        <span className="absolute -bottom-1.5 -right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-white/65 shadow-lg">
          <Lock className="h-3.5 w-3.5" strokeWidth={2.3} />
        </span>
      )}
    </div>
  );
}

export function LessonIcon({
  lessonId,
  unitId,
  className,
  strokeWidth,
}: IconProps & { lessonId: string; unitId?: string }) {
  const Icon = LESSON_ICONS[lessonId] ?? (unitId ? UNIT_ICONS[unitId] : undefined) ?? Book;
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
  Trophy,
  ThumbsUp,
  Star,
  Check,
  X,
  Coins,
  Sparkles,
  Crown,
  Palette,
  Stethoscope,
  GraduationCap,
  HeartPulse,
  Ambulance,
};
