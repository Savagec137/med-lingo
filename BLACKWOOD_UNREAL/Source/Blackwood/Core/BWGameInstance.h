// Instance de jeu : charge le registre de données et transmet la demande de chargement
// d'une sauvegarde d'une map à l'autre.
#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "BWGameInstance.generated.h"

class UBWGameData;

UCLASS()
class BLACKWOOD_API UBWGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	virtual void Init() override;

	UFUNCTION(BlueprintPure, Category = "Blackwood")
	UBWGameData* GetGameData() const { return GameData; }

	/** Emplacement à charger à l'arrivée dans la map de jeu (-1 : nouvelle partie). */
	UPROPERTY(BlueprintReadWrite, Category = "Blackwood")
	int32 PendingLoadSlot = -1;

	/** Difficulté : 0 facile, 1 normal, 2 difficile (Settings.difficulty de Godot). */
	UPROPERTY(BlueprintReadWrite, Category = "Blackwood")
	int32 Difficulty = 1;

private:
	UPROPERTY()
	TObjectPtr<UBWGameData> GameData;
};
