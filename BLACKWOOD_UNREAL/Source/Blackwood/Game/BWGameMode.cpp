#include "Game/BWGameMode.h"
#include "Game/BWGameState.h"
#include "Player/BWCharacter.h"
#include "Player/BWPlayerController.h"
#include "Player/BWPlayerState.h"
#include "Player/BWDebugHUD.h"
#include "Save/BWSaveSubsystem.h"
#include "Core/BWGameInstance.h"
#include "Blackwood.h"
#include "EngineUtils.h"
#include "Engine/World.h"
#include "GameFramework/PlayerStart.h"

ABWGameMode::ABWGameMode()
{
	GameStateClass = ABWGameState::StaticClass();
	PlayerStateClass = ABWPlayerState::StaticClass();
	PlayerControllerClass = ABWPlayerController::StaticClass();
	DefaultPawnClass = ABWCharacter::StaticClass();
	HUDClass = ABWDebugHUD::StaticClass();
}

void ABWGameMode::PreLogin(const FString& Options, const FString& Address, const FUniqueNetIdRepl& UniqueId, FString& ErrorMessage)
{
	Super::PreLogin(Options, Address, UniqueId, ErrorMessage);
	if (ErrorMessage.IsEmpty() && GetNumPlayers() >= MaxPlayers)
	{
		ErrorMessage = TEXT("Partie complète (2 joueurs maximum).");
	}
}

void ABWGameMode::PostLogin(APlayerController* NewPlayer)
{
	// Place 1 = hôte / solo, 2 = invité (comme Net.slots dans Godot) — avant l'apparition
	if (ABWPlayerState* PS = NewPlayer ? NewPlayer->GetPlayerState<ABWPlayerState>() : nullptr)
	{
		TSet<int32> Used;
		for (APlayerState* Other : GameState->PlayerArray)
		{
			const ABWPlayerState* OtherPS = Cast<ABWPlayerState>(Other);
			if (OtherPS && OtherPS != PS)
			{
				Used.Add(OtherPS->PlayerSlot);
			}
		}
		PS->PlayerSlot = Used.Contains(1) ? 2 : 1;
	}
	Super::PostLogin(NewPlayer);
}

AActor* ABWGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
	const ABWPlayerState* PS = Player ? Player->GetPlayerState<ABWPlayerState>() : nullptr;
	const FName Wanted(*FString::Printf(TEXT("P%d"), PS ? PS->PlayerSlot : 1));
	for (TActorIterator<APlayerStart> It(GetWorld()); It; ++It)
	{
		if (It->PlayerStartTag == Wanted)
		{
			return *It;
		}
	}
	return Super::ChoosePlayerStart_Implementation(Player);
}

void ABWGameMode::StartPlay()
{
	Super::StartPlay();
	UBWGameInstance* GI = Cast<UBWGameInstance>(GetGameInstance());
	if (GI && GI->PendingLoadSlot >= 0)
	{
		const int32 Slot = GI->PendingLoadSlot;
		GI->PendingLoadSlot = -1;
		if (UBWSaveSubsystem* Saves = GI->GetSubsystem<UBWSaveSubsystem>())
		{
			Saves->LoadFromSlot(GetWorld(), Slot);
		}
	}
}

void ABWGameMode::AutoSave(const FString& Reason)
{
	if (UBWSaveSubsystem* Saves = GetGameInstance()->GetSubsystem<UBWSaveSubsystem>())
	{
		Saves->AutoSave(GetWorld(), Reason);
	}
}
