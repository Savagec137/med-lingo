import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PROFILE_CARD, type ProfileCardCode } from "@/features/gamification/domain/profile-cards";

export async function fetchEquippedProfileCard(): Promise<ProfileCardCode> {
  const { data, error } = await supabase
    .from("user_profile_customization" as never)
    .select("profile_card_code")
    .maybeSingle();

  if (error) throw error;
  const code = (data as { profile_card_code?: string } | null)?.profile_card_code;
  return (code ?? DEFAULT_PROFILE_CARD) as ProfileCardCode;
}

export async function equipProfileCard(code: ProfileCardCode) {
  const { data, error } = await supabase.rpc(
    "equip_game_profile_card" as never,
    { _item_code: code } as never,
  );
  if (error) throw error;
  return data;
}
