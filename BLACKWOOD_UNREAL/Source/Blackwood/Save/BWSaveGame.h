// Sauvegarde : mêmes informations que le JSON de blackwood/save/save_system.gd
// (GameState.to_dict + position du joueur), en USaveGame.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Core/BWTypes.h"
#include "BWSaveGame.generated.h"

/** Données d'un joueur (PlayerData.to_dict). */
USTRUCT(BlueprintType)
struct FBWPlayerSave
{
	GENERATED_BODY()

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	int32 PlayerSlot = 1;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float Health = 100.f;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FBWItemStack> Inventory;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FBWWeaponState> Weapons;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	FName Equipped;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	bool bFlashlightOn = false;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float FlashlightBattery = 100.f;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	EBWLifeState LifeState = EBWLifeState::Alive;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float BleedTime = 0.f;

	/** Position (cm, repère Unreal) et orientation du personnage. */
	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	FVector Location = FVector::ZeroVector;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float Yaw = 0.f;
};

/** État du monde (partie « monde » de GameState.to_dict). */
USTRUCT(BlueprintType)
struct FBWWorldSave
{
	GENERATED_BODY()

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FName> Flags;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FName> KeyRing;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FName> Documents;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FName> TakenPickups;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FName> DeadEnemies;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	TArray<FBWDoorState> DoorStates;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float Playtime = 0.f;

	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	FName CurrentZone;

	/** Compte à rebours de l'autodestruction (-1 : inactif). */
	UPROPERTY(SaveGame, BlueprintReadWrite, Category = "Sauvegarde")
	float Countdown = -1.f;
};

UCLASS()
class BLACKWOOD_API UBWSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	/** Format de la sauvegarde (augmenté à chaque changement incompatible). */
	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	int32 Version = 1;

	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	FDateTime SavedAt;

	/** Lieu affiché dans les menus (« Urgences — sous-sol -1 »…). */
	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	FText PlaceName;

	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	int32 Difficulty = 1;

	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	FBWWorldSave World;

	/** Joueur 1 (hôte) puis joueur 2 en coop. */
	UPROPERTY(SaveGame, BlueprintReadOnly, Category = "Sauvegarde")
	TArray<FBWPlayerSave> Players;
};
