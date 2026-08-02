// Premium AI-generated assets. Falls back to Lucide icons via icon-map when missing.
import stethoscope from "@/assets/game/avatar-stethoscope.png";
import ambulance from "@/assets/game/avatar-ambulance.png";
import heart from "@/assets/game/avatar-heart.png";
import brain from "@/assets/game/avatar-brain.png";
import lungs from "@/assets/game/avatar-lungs.png";
import dna from "@/assets/game/avatar-dna.png";
import syringe from "@/assets/game/avatar-syringe.png";
import microscope from "@/assets/game/avatar-microscope.png";
import dragon from "@/assets/game/avatar-dragon.png";
import crown from "@/assets/game/avatar-crown.png";
import avatarStudent from "@/assets/game/avatar-student.png";
import avatarNurse from "@/assets/game/avatar-nurse.png";
import avatarParamedic from "@/assets/game/avatar-paramedic.png";
import avatarDoctor from "@/assets/game/avatar-doctor.png";
import avatarSurgeon from "@/assets/game/avatar-surgeon.png";
import avatarSamu from "@/assets/game/avatar-samu.png";
import avatarProfessor from "@/assets/game/avatar-professor.png";

import badgeFirstCare from "@/assets/game/badge-first-care.png";
import badgeDefibrillator from "@/assets/game/badge-defibrillator.png";
import badgePulseElite from "@/assets/game/badge-pulse-elite.png";
import badgePrecision from "@/assets/game/badge-precision.png";
import badgeGuardian from "@/assets/game/badge-guardian.png";
import badgeGoldLegacy from "@/assets/badge-gold.png";

import frameBronze from "@/assets/game/frame-bronze.png";
import frameSilver from "@/assets/game/frame-silver.png";
import frameGold from "@/assets/game/frame-gold.png";
import frameDiamond from "@/assets/game/frame-diamond.png";
import frameNeon from "@/assets/game/frame-neon.png";

import bgHospital from "@/assets/game/bg-hospital.jpg";
import bgAnatomy from "@/assets/game/bg-anatomy.jpg";
import bgAmbulance from "@/assets/game/bg-ambulance.jpg";
import bgOperatingRoom from "@/assets/game/bg-operating-room.jpg";
import bgAurora from "@/assets/game/bg-aurora.jpg";

import chestBronze from "@/assets/game/chest-bronze.png";
import chestSilver from "@/assets/game/chest-silver.png";
import chestGold from "@/assets/game/chest-gold.png";
import chestLegendary from "@/assets/game/chest-legendary.png";
import chestMythic from "@/assets/game/chest-mythic.png";

/** Assets rendered contained (transparent subject, centered). */
export const SHOP_IMAGE: Record<string, string> = {
  // Avatars — personnages
  avatar_student: avatarStudent,
  avatar_nurse: avatarNurse,
  avatar_paramedic: avatarParamedic,
  avatar_doctor: avatarDoctor,
  avatar_surgeon: avatarSurgeon,
  avatar_samu: avatarSamu,
  avatar_professor: avatarProfessor,
  // Avatars — icônes médicales
  av_stethoscope: stethoscope,
  av_ambulance: ambulance,
  av_heart: heart,
  av_brain: brain,
  av_lungs: lungs,
  av_dna: dna,
  av_syringe: syringe,
  av_microscope: microscope,
  av_dragon: dragon,
  av_crown: crown,
  avatar_dragon: dragon,
  avatar_crown: crown,
  // Badges
  badge_first_care: badgeFirstCare,
  badge_defibrillator: badgeDefibrillator,
  badge_pulse_elite: badgePulseElite,
  game_badge_precision: badgePrecision,
  game_badge_guardian: badgeGuardian,
  badge_precision: badgePrecision,
  badge_guardian: badgeGuardian,
  badge_gold: badgeGoldLegacy,
  // Cadres
  frame_bronze: frameBronze,
  fr_bronze: frameBronze,
  frame_silver: frameSilver,
  fr_silver: frameSilver,
  frame_gold: frameGold,
  fr_gold: frameGold,
  frame_diamond: frameDiamond,
  fr_diamond: frameDiamond,
  frame_neon: frameNeon,
  fr_neon: frameNeon,
  // Coffres
  chest_small: chestBronze,
  chest_medium: chestSilver,
  chest_big: chestGold,
  chest_epic: chestLegendary,
  game_chest_bronze: chestBronze,
  game_chest_silver: chestSilver,
  game_chest_gold: chestGold,
  game_chest_legendary: chestLegendary,
  game_chest_mythic: chestMythic,
};

/** Assets rendered as a full-bleed cover (profile card backgrounds). */
export const BACKGROUND_IMAGE: Record<string, string> = {
  bg_hospital: bgHospital,
  bg_anatomy: bgAnatomy,
  bg_xray: bgAnatomy,
  bg_ambulance: bgAmbulance,
  bg_operating_room: bgOperatingRoom,
  bg_aurora: bgAurora,
  bg_premium_aurora: bgAurora,
};

export const CHEST_IMAGE: Record<string, string> = {
  bronze: chestBronze,
  silver: chestSilver,
  gold: chestGold,
  epic: chestLegendary,
  legendary: chestLegendary,
  mythique: chestMythic,
  mythic: chestMythic,
};

export const PREMIUM_CROWN = crown;
export const BADGE_GOLD = badgeGoldLegacy;
