#include "Save/BWSaveSubsystem.h"
#include "Save/BWSaveGame.h"
#include "Game/BWGameState.h"
#include "Player/BWPlayerState.h"
#include "Core/BWGameInstance.h"
#include "Blackwood.h"
#include "Engine/World.h"
#include "GameFramework/Controller.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"

FString UBWSaveSubsystem::SlotName(int32 Slot)
{
	return Slot == 0 ? FString(TEXT("autosave")) : FString::Printf(TEXT("slot_%d"), Slot);
}

bool UBWSaveSubsystem::HasSlot(int32 Slot) const
{
	return UGameplayStatics::DoesSaveGameExist(SlotName(Slot), 0);
}

bool UBWSaveSubsystem::HasAnySave() const
{
	for (int32 Slot = 0; Slot <= SlotCount; ++Slot)
	{
		if (HasSlot(Slot))
		{
			return true;
		}
	}
	return false;
}

UBWSaveGame* UBWSaveSubsystem::ReadSlot(int32 Slot) const
{
	return Cast<UBWSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName(Slot), 0));
}

int32 UBWSaveSubsystem::LatestSlot() const
{
	int32 Best = -1;
	FDateTime BestTime = FDateTime::MinValue();
	for (int32 Slot = 0; Slot <= SlotCount; ++Slot)
	{
		const UBWSaveGame* Save = HasSlot(Slot) ? ReadSlot(Slot) : nullptr;
		if (Save && Save->SavedAt > BestTime)
		{
			BestTime = Save->SavedAt;
			Best = Slot;
		}
	}
	return Best;
}

bool UBWSaveSubsystem::SaveToSlot(UWorld* World, int32 Slot)
{
	ABWGameState* GS = World ? World->GetGameState<ABWGameState>() : nullptr;
	if (!GS || !GS->HasAuthority() || Slot < 0 || Slot > SlotCount)
	{
		return false;
	}
	UBWSaveGame* Save = Cast<UBWSaveGame>(UGameplayStatics::CreateSaveGameObject(UBWSaveGame::StaticClass()));
	Save->SavedAt = FDateTime::Now();
	Save->PlaceName = FText::FromName(GS->CurrentZone);
	if (const UBWGameInstance* GI = Cast<UBWGameInstance>(GetGameInstance()))
	{
		Save->Difficulty = GI->Difficulty;
	}
	GS->WriteToSave(Save->World);
	for (APlayerState* Base : GS->PlayerArray)
	{
		const ABWPlayerState* PS = Cast<ABWPlayerState>(Base);
		if (!PS)
		{
			continue;
		}
		FBWPlayerSave& Out = Save->Players.AddDefaulted_GetRef();
		PS->WriteToSave(Out);
		if (const APawn* Pawn = PS->GetPawn())
		{
			Out.Location = Pawn->GetActorLocation();
			Out.Yaw = static_cast<float>(Pawn->GetActorRotation().Yaw);
		}
	}
	Save->Players.Sort([](const FBWPlayerSave& A, const FBWPlayerSave& B) { return A.PlayerSlot < B.PlayerSlot; });
	return UGameplayStatics::SaveGameToSlot(Save, SlotName(Slot), 0);
}

bool UBWSaveSubsystem::LoadFromSlot(UWorld* World, int32 Slot)
{
	ABWGameState* GS = World ? World->GetGameState<ABWGameState>() : nullptr;
	UBWSaveGame* Save = (GS && GS->HasAuthority() && HasSlot(Slot)) ? ReadSlot(Slot) : nullptr;
	if (!Save)
	{
		return false;
	}
	if (UBWGameInstance* GI = Cast<UBWGameInstance>(GetGameInstance()))
	{
		GI->Difficulty = Save->Difficulty;
	}
	GS->ReadFromSave(Save->World);
	for (APlayerState* Base : GS->PlayerArray)
	{
		ABWPlayerState* PS = Cast<ABWPlayerState>(Base);
		const FBWPlayerSave* In = PS ? Save->Players.FindByPredicate(
			[PS](const FBWPlayerSave& P) { return P.PlayerSlot == PS->PlayerSlot; }) : nullptr;
		if (!In)
		{
			continue;
		}
		PS->ReadFromSave(*In);
		if (APawn* Pawn = PS->GetPawn())
		{
			const FRotator Facing(0.f, In->Yaw, 0.f);
			Pawn->TeleportTo(In->Location, Facing);
			if (AController* Controller = Pawn->GetController())
			{
				Controller->SetControlRotation(Facing);
			}
		}
	}
	UE_LOG(LogBlackwood, Log, TEXT("Sauvegarde %s chargée (%s)"), *SlotName(Slot), *Save->PlaceName.ToString());
	return true;
}

bool UBWSaveSubsystem::AutoSave(UWorld* World, const FString& Reason)
{
	if (!World)
	{
		return false;
	}
	const double Now = World->GetTimeSeconds();
	if (Now - LastAutoSaveTime < 1.0)
	{
		return false;
	}
	ABWGameState* GS = World->GetGameState<ABWGameState>();
	if (!GS || GS->GetFlag(TEXT("game_complete")))
	{
		return false;
	}
	// Jamais si tous les joueurs sont morts
	bool bSomeoneAlive = false;
	for (APlayerState* Base : GS->PlayerArray)
	{
		const ABWPlayerState* PS = Cast<ABWPlayerState>(Base);
		bSomeoneAlive |= PS && PS->GetLifeState() != EBWLifeState::Dead;
	}
	if (!bSomeoneAlive)
	{
		return false;
	}
	LastAutoSaveTime = Now;
	UE_LOG(LogBlackwood, Log, TEXT("Sauvegarde automatique : %s"), *Reason);
	return SaveToSlot(World, 0);
}
