// Types partagés : énumérations et structures reprises du projet Godot (référence : blackwood/).
#pragma once

#include "CoreMinimal.h"
#include "BWTypes.generated.h"

/** Genre d'objet (champ « kind » de blackwood/data/items.gd). */
UENUM(BlueprintType)
enum class EBWItemKind : uint8
{
	Weapon,		// arme équipable
	Ammo,		// munitions empilables
	Heal,		// soin utilisable
	Key,		// clé / objet de progression : va au porte-clés commun
	Instant,	// consommé au ramassage (piles)
	Tool		// équipement permanent hors emplacements (lampe torche)
};

/** Verrou d'une porte (Door.Lock de blackwood/items/door.gd). */
UENUM(BlueprintType)
enum class EBWLockType : uint8
{
	None,		// libre
	Locked,		// condamnée (message d'ambiance)
	Key,		// clé ou carte du porte-clés
	Item,		// objet à poser (fusible)
	Event		// ouverte par le scénario
};

/** Type de tir (champ « kind » de blackwood/data/weapons.gd). */
UENUM(BlueprintType)
enum class EBWWeaponKind : uint8
{
	Melee,
	Hitscan,
	Pellets
};

/** État d'un joueur (PlayerData : downed / dead). */
UENUM(BlueprintType)
enum class EBWLifeState : uint8
{
	Alive,
	Downed,		// coop : à terre, réanimable
	Dead
};

/** Comportement d'un luminaire (LightFixture.Mode). */
UENUM(BlueprintType)
enum class EBWLightMode : uint8
{
	Steady,		// stable
	Flicker,	// coupures brèves et irrégulières
	Broken,		// éteint la plupart du temps, grésille par salves
	Pulse,		// pulsation lente (veilleuses, alerte)
	Off			// éteint (peut être rallumé par un événement)
};

/** Emplacement d'inventaire : identifiant d'objet + quantité. */
USTRUCT(BlueprintType)
struct FBWItemStack
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Inventaire")
	FName ItemId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Inventaire")
	int32 Count = 0;

	bool IsEmpty() const { return ItemId.IsNone() || Count <= 0; }
};

/** Arme possédée et balles dans son chargeur. */
USTRUCT(BlueprintType)
struct FBWWeaponState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Armes")
	FName WeaponId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Armes")
	int32 Mag = 0;
};

/** État sauvegardé d'une porte (door_states de GameState). */
USTRUCT(BlueprintType)
struct FBWDoorState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Portes")
	FName DoorId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Portes")
	EBWLockType Lock = EBWLockType::None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Portes")
	bool bOpen = false;

	/** Sens d'ouverture (+1 / -1). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Portes")
	float OpenDir = 1.f;

	/** Portes automatiques : alimentées ou non. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Portes")
	bool bPowered = true;
};

/** Multiplicateurs d'une difficulté (Settings.damage_taken_mult / ammo_mult / enemy_hp_mult). */
USTRUCT(BlueprintType)
struct FBWDifficulty
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Difficulté")
	float DamageTaken = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Difficulté")
	float Ammo = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Difficulté")
	float EnemyHealth = 1.f;

	/** Compte à rebours de l'autodestruction (s). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Difficulté")
	float Countdown = 240.f;
};
