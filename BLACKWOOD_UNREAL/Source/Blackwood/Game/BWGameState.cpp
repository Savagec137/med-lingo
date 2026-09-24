#include "Game/BWGameState.h"
#include "Game/BWObjectives.h"
#include "Player/BWPlayerState.h"
#include "Save/BWSaveGame.h"
#include "Blackwood.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Net/UnrealNetwork.h"

ABWGameState::ABWGameState()
{
	PrimaryActorTick.bCanEverTick = true;
	CurrentZone = FName(TEXT("exterior"));
}

void ABWGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(ABWGameState, Playtime);
	DOREPLIFETIME(ABWGameState, CurrentZone);
	DOREPLIFETIME(ABWGameState, Countdown);
	DOREPLIFETIME(ABWGameState, Flags);
	DOREPLIFETIME(ABWGameState, KeyRing);
	DOREPLIFETIME(ABWGameState, Documents);
	DOREPLIFETIME(ABWGameState, TakenPickups);
	DOREPLIFETIME(ABWGameState, DeadEnemies);
	DOREPLIFETIME(ABWGameState, DoorStates);
}

void ABWGameState::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (HasAuthority())
	{
		Playtime += DeltaSeconds;
		if (Countdown > 0.f)
		{
			Countdown = FMath::Max(Countdown - DeltaSeconds, 0.f);
		}
	}
}

// --- Drapeaux -------------------------------------------------------------------------------

void ABWGameState::SetFlag(FName Flag, bool bValue)
{
	if (!HasAuthority() || Flag.IsNone())
	{
		return;
	}
	const bool bHad = Flags.Contains(Flag);
	if (bValue == bHad)
	{
		return;
	}
	if (bValue)
	{
		Flags.Add(Flag);
	}
	else
	{
		Flags.Remove(Flag);
	}
	OnFlagChanged.Broadcast(Flag, bValue);
	RefreshObjective();
}

void ABWGameState::OnRep_Flags(const TArray<FName>& OldFlags)
{
	for (const FName& F : Flags)
	{
		if (!OldFlags.Contains(F))
		{
			OnFlagChanged.Broadcast(F, true);
		}
	}
	for (const FName& F : OldFlags)
	{
		if (!Flags.Contains(F))
		{
			OnFlagChanged.Broadcast(F, false);
		}
	}
	RefreshObjective();
}

// --- Porte-clés ------------------------------------------------------------------------------

void ABWGameState::AddKey(FName ItemId)
{
	if (!HasAuthority() || ItemId.IsNone())
	{
		return;
	}
	KeyRing.AddUnique(ItemId);
	OnKeyRingChanged.Broadcast();
	RefreshObjective();
}

bool ABWGameState::RemoveKey(FName ItemId)
{
	if (!HasAuthority() || KeyRing.Remove(ItemId) == 0)
	{
		return false;
	}
	OnKeyRingChanged.Broadcast();
	RefreshObjective();
	return true;
}

void ABWGameState::OnRep_KeyRing()
{
	OnKeyRingChanged.Broadcast();
	RefreshObjective();
}

// --- Documents --------------------------------------------------------------------------------

bool ABWGameState::AddDocument(FName DocId)
{
	if (!HasAuthority() || DocId.IsNone() || Documents.Contains(DocId))
	{
		return false;
	}
	Documents.Add(DocId);
	OnDocumentCollected.Broadcast(DocId);
	RefreshObjective();
	return true;
}

void ABWGameState::OnRep_Documents(const TArray<FName>& OldDocuments)
{
	for (const FName& D : Documents)
	{
		if (!OldDocuments.Contains(D))
		{
			OnDocumentCollected.Broadcast(D);
		}
	}
	RefreshObjective();
}

// --- Monde ------------------------------------------------------------------------------------

void ABWGameState::MarkPickupTaken(FName PickupId)
{
	if (HasAuthority() && !PickupId.IsNone())
	{
		TakenPickups.AddUnique(PickupId);
	}
}

void ABWGameState::MarkEnemyDead(FName SpawnId)
{
	if (HasAuthority() && !SpawnId.IsNone())
	{
		DeadEnemies.AddUnique(SpawnId);
	}
}

void ABWGameState::SetDoorState(const FBWDoorState& State)
{
	if (!HasAuthority() || State.DoorId.IsNone())
	{
		return;
	}
	for (FBWDoorState& Existing : DoorStates)
	{
		if (Existing.DoorId == State.DoorId)
		{
			Existing = State;
			return;
		}
	}
	DoorStates.Add(State);
}

bool ABWGameState::FindDoorState(FName DoorId, FBWDoorState& OutState) const
{
	for (const FBWDoorState& Existing : DoorStates)
	{
		if (Existing.DoorId == DoorId)
		{
			OutState = Existing;
			return true;
		}
	}
	return false;
}

void ABWGameState::SetCurrentZone(FName Zone)
{
	if (HasAuthority() && Zone != CurrentZone)
	{
		CurrentZone = Zone;
		OnZoneChanged.Broadcast(CurrentZone);
	}
}

void ABWGameState::OnRep_CurrentZone()
{
	OnZoneChanged.Broadcast(CurrentZone);
}

void ABWGameState::SetCountdown(float Seconds)
{
	if (HasAuthority())
	{
		Countdown = Seconds;
	}
}

void ABWGameState::NotifyTrigger(FName TriggerName)
{
	if (HasAuthority())
	{
		UE_LOG(LogBlackwood, Verbose, TEXT("Déclencheur : %s"), *TriggerName.ToString());
		OnTriggerFired.Broadcast(TriggerName);
	}
}

// --- Objectif ---------------------------------------------------------------------------------

const ABWPlayerState* ABWGameState::GetLocalPlayerState() const
{
	const UWorld* World = GetWorld();
	const APlayerController* PC = World ? World->GetFirstPlayerController() : nullptr;
	return PC ? PC->GetPlayerState<ABWPlayerState>() : nullptr;
}

FText ABWGameState::GetObjectiveText() const
{
	return FBWObjectives::GetCurrentText(this, GetLocalPlayerState());
}

void ABWGameState::RefreshObjective()
{
	const int32 Index = FBWObjectives::GetCurrentIndex(this, GetLocalPlayerState());
	if (Index != LastObjectiveIndex)
	{
		LastObjectiveIndex = Index;
		OnObjectiveChanged.Broadcast();
	}
}

// --- Sauvegarde -------------------------------------------------------------------------------

void ABWGameState::WriteToSave(FBWWorldSave& Out) const
{
	Out.Flags = Flags;
	Out.KeyRing = KeyRing;
	Out.Documents = Documents;
	Out.TakenPickups = TakenPickups;
	Out.DeadEnemies = DeadEnemies;
	Out.DoorStates = DoorStates;
	Out.Playtime = Playtime;
	Out.CurrentZone = CurrentZone;
	Out.Countdown = Countdown;
}

void ABWGameState::ReadFromSave(const FBWWorldSave& In)
{
	if (!HasAuthority())
	{
		return;
	}
	Flags = In.Flags;
	KeyRing = In.KeyRing;
	Documents = In.Documents;
	TakenPickups = In.TakenPickups;
	DeadEnemies = In.DeadEnemies;
	DoorStates = In.DoorStates;
	Playtime = In.Playtime;
	CurrentZone = In.CurrentZone.IsNone() ? FName(TEXT("exterior")) : In.CurrentZone;
	Countdown = In.Countdown;
	OnKeyRingChanged.Broadcast();
	OnZoneChanged.Broadcast(CurrentZone);
	LastObjectiveIndex = INDEX_NONE;
	RefreshObjective();
}
