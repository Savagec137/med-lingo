// Réglages du projet (Paramètres du projet > Jeu > Blackwood), enregistrés dans Config/DefaultGame.ini.
#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "BWProjectSettings.generated.h"

class UBWGameData;
class USkeletalMesh;
class UAnimInstance;

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "Blackwood"))
class BLACKWOOD_API UBWProjectSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	/** Registre des données (créé par Scripts/import_all.py). */
	UPROPERTY(Config, EditAnywhere, Category = "Données")
	TSoftObjectPtr<UBWGameData> GameData;

	/** Modèle du joueur (provisoire : mannequin du modèle « Third Person » d'Unreal, s'il est ajouté au projet). */
	UPROPERTY(Config, EditAnywhere, Category = "Personnage")
	TSoftObjectPtr<USkeletalMesh> PlayerMesh;

	UPROPERTY(Config, EditAnywhere, Category = "Personnage")
	TSoftClassPtr<UAnimInstance> PlayerAnimClass;

	/** Candelas par unité d'énergie de lumière Godot (luminaires importés et lampe torche). */
	UPROPERTY(Config, EditAnywhere, Category = "Éclairage", meta = (ClampMin = "0.1"))
	float LightIntensityScale = 60.f;

	/**
	 * Conversion des coordonnées Godot (m, Y vers le haut, repère direct) vers Unreal (cm, Z vers
	 * le haut) : vecteur Unreal correspondant à 1 m sur chaque axe Godot. Calibré par
	 * Scripts/import_all.py avec les repères SM_Calib_X/Y/Z (même conversion que l'import glTF).
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Import Godot")
	FVector GodotAxisX = FVector(0.f, 100.f, 0.f);

	UPROPERTY(Config, EditAnywhere, Category = "Import Godot")
	FVector GodotAxisY = FVector(0.f, 0.f, 100.f);

	UPROPERTY(Config, EditAnywhere, Category = "Import Godot")
	FVector GodotAxisZ = FVector(-100.f, 0.f, 0.f);

	FVector GodotToUnreal(const FVector& Godot) const
	{
		return GodotAxisX * Godot.X + GodotAxisY * Godot.Y + GodotAxisZ * Godot.Z;
	}

	FVector UnrealToGodot(const FVector& Unreal) const
	{
		return FVector(
			FVector::DotProduct(Unreal, GodotAxisX) / FMath::Max(GodotAxisX.SizeSquared(), 1.0),
			FVector::DotProduct(Unreal, GodotAxisY) / FMath::Max(GodotAxisY.SizeSquared(), 1.0),
			FVector::DotProduct(Unreal, GodotAxisZ) / FMath::Max(GodotAxisZ.SizeSquared(), 1.0));
	}

	static const UBWProjectSettings* Get() { return GetDefault<UBWProjectSettings>(); }
};
