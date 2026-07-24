import charterInput from "./medlingo-charter.json";
import { parseMedlingoOfficialCharter } from "./medlingo-charter-schema.ts";

export const MEDLINGO_OFFICIAL_CHARTER = parseMedlingoOfficialCharter(charterInput);
