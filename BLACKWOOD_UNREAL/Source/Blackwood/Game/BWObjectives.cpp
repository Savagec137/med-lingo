#include "Game/BWObjectives.h"
#include "Game/BWGameState.h"
#include "Player/BWPlayerState.h"
#include "Data/BWGameData.h"

namespace
{
	bool Flag(const ABWGameState* GS, const TCHAR* Name)
	{
		return GS->GetFlag(FName(Name));
	}

	bool HasItem(const ABWGameState* GS, const ABWPlayerState* PS, const TCHAR* Id)
	{
		const FName ItemId(Id);
		return GS->HasKey(ItemId) || (PS && PS->HasItem(ItemId));
	}
}

int32 FBWObjectives::GetCurrentIndex(const ABWGameState* GS, const ABWPlayerState* PS)
{
	if (!GS)
	{
		return Count - 1;
	}
	// Ordre identique à data/objectives.gd : le premier test vrai l'emporte.
	if (Flag(GS, TEXT("game_complete"))) return 0;
	if (Flag(GS, TEXT("self_destruct")))
	{
		if (Flag(GS, TEXT("esc_b1"))) return 1;
		if (Flag(GS, TEXT("esc_8"))) return 2;
		return 3;
	}
	if (Flag(GS, TEXT("reached_f12"))) return 4;
	if (Flag(GS, TEXT("sarah_dead"))) return 5;
	if (Flag(GS, TEXT("sarah_boss_started"))) return 6;
	if (Flag(GS, TEXT("reached_f11"))) return 7;
	if (HasItem(GS, PS, TEXT("key_private"))) return 8;
	if (Flag(GS, TEXT("sarah_video_seen"))) return 9;
	if (Flag(GS, TEXT("reached_f8"))) return 10;
	if (HasItem(GS, PS, TEXT("card_research"))) return 11;
	if (Flag(GS, TEXT("reached_floor_6"))) return 12;
	if (Flag(GS, TEXT("stair_b_open"))) return 13;
	if (Flag(GS, TEXT("surgeon_started")) && !Flag(GS, TEXT("surgeon_dead"))) return 14;
	if (GS->HasDocument(FName(TEXT("doc_sarah_note")))) return 15;
	if (HasItem(GS, PS, TEXT("key_locker"))) return 16;
	if (Flag(GS, TEXT("reached_f3"))) return 17;
	if (Flag(GS, TEXT("power_restored"))) return 18;
	if (Flag(GS, TEXT("b2_arrived"))) return 19;
	if (HasItem(GS, PS, TEXT("key_technical"))) return 20;
	if (Flag(GS, TEXT("reached_ground"))) return 21;
	if (Flag(GS, TEXT("nurse_seen"))) return 22;
	if (Flag(GS, TEXT("entered_hospital"))) return 23;
	if (Flag(GS, TEXT("main_door_seen"))) return 24;
	return 25;
}

FText FBWObjectives::GetCurrentText(const ABWGameState* GS, const ABWPlayerState* PS)
{
	const UBWGameData* Data = GS ? UBWGameData::Get(GS) : nullptr;
	const int32 Index = GetCurrentIndex(GS, PS);
	if (!Data || !Data->Objectives.IsValidIndex(Index))
	{
		return FText::GetEmpty();
	}
	return Data->Objectives[Index];
}
