#include "Player/BWPlayerController.h"
#include "Player/BWInputConfig.h"
#include "Player/BWPlayerState.h"
#include "Player/BWCharacter.h"
#include "Player/BWDebugHUD.h"
#include "Game/BWGameState.h"
#include "Save/BWSaveSubsystem.h"
#include "Core/BWGameInstance.h"
#include "Core/BWProjectSettings.h"
#include "Data/BWGameData.h"
#include "Data/BWDefinitions.h"
#include "Blackwood.h"

#include "Camera/PlayerCameraManager.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "Engine/World.h"

ABWPlayerController::ABWPlayerController()
{
	InputConfig = CreateDefaultSubobject<UBWInputConfig>(TEXT("InputConfig"));
}

UBWInputConfig* ABWPlayerController::GetInputConfig() const
{
	// Actions construites à la première demande (le pion peut lier ses entrées avant BeginPlay)
	if (InputConfig && !InputConfig->Context)
	{
		InputConfig->Build();
	}
	return InputConfig;
}

void ABWPlayerController::BeginPlay()
{
	Super::BeginPlay();
	if (!IsLocalController())
	{
		return;
	}
	if (ULocalPlayer* LocalPlayer = GetLocalPlayer())
	{
		if (UEnhancedInputLocalPlayerSubsystem* Input = LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
		{
			Input->AddMappingContext(GetInputConfig()->Context, 0);
		}
	}
	// Limites de tangage de la caméra (player_camera.gd : -1,15 à 0,85 rad)
	if (PlayerCameraManager)
	{
		PlayerCameraManager->ViewPitchMin = FMath::RadiansToDegrees(ABWCharacter::PitchMin);
		PlayerCameraManager->ViewPitchMax = FMath::RadiansToDegrees(ABWCharacter::PitchMax);
	}
	SetInputMode(FInputModeGameOnly());
	bShowMouseCursor = false;
}

void ABWPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();
	if (UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(InputComponent))
	{
		Input->BindAction(GetInputConfig()->DebugPerf, ETriggerEvent::Started, this, &ABWPlayerController::ToggleDebugHUD);
	}
}

void ABWPlayerController::ToggleDebugHUD()
{
	if (ABWDebugHUD* DebugHUD = GetHUD<ABWDebugHUD>())
	{
		DebugHUD->bShowDebug = !DebugHUD->bShowDebug;
	}
}

// --- Commandes de test -----------------------------------------------------------------------

void ABWPlayerController::BWFlag(const FString& Flag, int32 bValue)
{
	ServerFlag(Flag, bValue != 0);
}

void ABWPlayerController::ServerFlag_Implementation(const FString& Flag, bool bValue)
{
	if (ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>())
	{
		GS->SetFlag(FName(*Flag), bValue);
		UE_LOG(LogBlackwood, Log, TEXT("Drapeau %s = %d"), *Flag, bValue ? 1 : 0);
	}
}

void ABWPlayerController::BWGive(const FString& ItemId, int32 Count)
{
	ServerGive(ItemId, Count);
}

void ABWPlayerController::ServerGive_Implementation(const FString& ItemId, int32 Count)
{
	ABWPlayerState* PS = GetPlayerState<ABWPlayerState>();
	ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>();
	const UBWGameData* Data = UBWGameData::Get(this);
	if (!PS || !GS || !Data)
	{
		return;
	}
	const FName Id(*ItemId);
	const UBWItemDefinition* Def = Data->FindItem(Id);
	if (!Def)
	{
		UE_LOG(LogBlackwood, Warning, TEXT("Objet inconnu : %s"), *ItemId);
		return;
	}
	// Mêmes effets qu'un ramassage dans Godot (Pickup._collect)
	switch (Def->Kind)
	{
	case EBWItemKind::Weapon:
		PS->GiveWeapon(Id, true);
		GS->SetFlag(FName(*FString::Printf(TEXT("has_%s"), *ItemId)));
		break;
	case EBWItemKind::Tool:
		GS->SetFlag(FName(*FString::Printf(TEXT("has_%s"), *ItemId)));
		break;
	case EBWItemKind::Instant:
		PS->SetFlashlightBattery(100.f);
		break;
	default:
		PS->AddItem(Id, FMath::Max(Count, 1));
		break;
	}
	UE_LOG(LogBlackwood, Log, TEXT("Donné : %s x%d"), *ItemId, Count);
}

void ABWPlayerController::BWSave(int32 Slot)
{
	ServerSave(Slot);
}

void ABWPlayerController::ServerSave_Implementation(int32 Slot)
{
	if (UBWSaveSubsystem* Saves = GetGameInstance()->GetSubsystem<UBWSaveSubsystem>())
	{
		const bool bOk = Saves->SaveToSlot(GetWorld(), Slot);
		UE_LOG(LogBlackwood, Log, TEXT("Sauvegarde emplacement %d : %s"), Slot, bOk ? TEXT("OK") : TEXT("ÉCHEC"));
	}
}

void ABWPlayerController::BWLoad(int32 Slot)
{
	ServerLoad(Slot);
}

void ABWPlayerController::ServerLoad_Implementation(int32 Slot)
{
	if (UBWSaveSubsystem* Saves = GetGameInstance()->GetSubsystem<UBWSaveSubsystem>())
	{
		const bool bOk = Saves->LoadFromSlot(GetWorld(), Slot);
		UE_LOG(LogBlackwood, Log, TEXT("Chargement emplacement %d : %s"), Slot, bOk ? TEXT("OK") : TEXT("ÉCHEC"));
	}
}

void ABWPlayerController::BWTp(float GodotX, float GodotY, float GodotZ)
{
	const FVector Target = UBWProjectSettings::Get()->GodotToUnreal(FVector(GodotX, GodotY, GodotZ));
	ServerTeleport(Target + FVector(0.0, 0.0, 95.0));
}

void ABWPlayerController::ServerTeleport_Implementation(FVector Location)
{
	if (APawn* P = GetPawn())
	{
		P->TeleportTo(Location, P->GetActorRotation());
	}
}

void ABWPlayerController::BWGod()
{
	ServerGod();
}

void ABWPlayerController::ServerGod_Implementation()
{
	if (ABWCharacter* C = GetPawn<ABWCharacter>())
	{
		C->bGodMode = !C->bGodMode;
		UE_LOG(LogBlackwood, Log, TEXT("God mode : %s"), C->bGodMode ? TEXT("oui") : TEXT("non"));
	}
}

void ABWPlayerController::BWDifficulty(int32 Level)
{
	if (UBWGameInstance* GI = Cast<UBWGameInstance>(GetGameInstance()))
	{
		GI->Difficulty = FMath::Clamp(Level, 0, 2);
	}
}
