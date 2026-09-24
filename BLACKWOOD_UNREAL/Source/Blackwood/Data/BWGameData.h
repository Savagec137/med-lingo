// Registre de toutes les données de jeu (un seul Data Asset : /Game/Blackwood/Data/DA_GameData).
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Core/BWTypes.h"
#include "BWGameData.generated.h"

class UBWItemDefinition;
class UBWWeaponDefinition;
class UBWEnemyDefinition;
class UBWDocumentDefinition;
class USoundBase;

UCLASS(BlueprintType)
class BLACKWOOD_API UBWGameData : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Données")
	TArray<TObjectPtr<UBWItemDefinition>> Items;

	/** Armes dans l'ordre de sélection (arme suivante / précédente). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Données")
	TArray<TObjectPtr<UBWWeaponDefinition>> Weapons;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Données")
	TArray<TObjectPtr<UBWEnemyDefinition>> Enemies;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Données")
	TArray<TObjectPtr<UBWDocumentDefinition>> Documents;

	/** Textes des objectifs, dans l'ordre des tests de blackwood/data/objectives.gd (voir BWObjectives). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Données")
	TArray<FText> Objectives;

	/** Facile, normal, difficile. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Difficulté")
	TArray<FBWDifficulty> Difficulty;

	/** Tous les sons importés ; le nom de l'asset est le nom Godot (« door_open », « step_tile_2 »…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
	TArray<TObjectPtr<USoundBase>> Sounds;

	UFUNCTION(BlueprintPure, Category = "Données")
	UBWItemDefinition* FindItem(FName ItemId) const;

	UFUNCTION(BlueprintPure, Category = "Données")
	UBWWeaponDefinition* FindWeapon(FName WeaponId) const;

	UFUNCTION(BlueprintPure, Category = "Données")
	UBWEnemyDefinition* FindEnemy(FName ProfileId) const;

	UFUNCTION(BlueprintPure, Category = "Données")
	UBWDocumentDefinition* FindDocument(FName DocId) const;

	/** Son par nom ; « hollow_groan » choisit au hasard parmi « hollow_groan_1…n ». */
	UFUNCTION(BlueprintPure, Category = "Audio")
	USoundBase* FindSound(FName SoundName) const;

	/** Multiplicateurs de la difficulté 0 (facile), 1 (normal) ou 2 (difficile). */
	UFUNCTION(BlueprintPure, Category = "Difficulté")
	FBWDifficulty GetDifficulty(int32 Level) const;

	/** Registre de la partie en cours (chargé par UBWGameInstance). */
	static UBWGameData* Get(const UObject* WorldContextObject);

	virtual FPrimaryAssetId GetPrimaryAssetId() const override { return FPrimaryAssetId(TEXT("BWGameData"), GetFName()); }

private:
	void BuildSoundIndex() const;

	mutable TMap<FName, TArray<TObjectPtr<USoundBase>>> SoundIndex;
};
