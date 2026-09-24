// Sauvegardes (blackwood/save/save_system.gd) : emplacement 0 = automatique, 1 à 3 = manuels.
// Seul le serveur (hôte) sauvegarde et charge ; les invités reçoivent l'état par réplication.
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BWSaveSubsystem.generated.h"

class UBWSaveGame;

UCLASS()
class BLACKWOOD_API UBWSaveSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	static constexpr int32 SlotCount = 3;

	static FString SlotName(int32 Slot);

	/** Serveur : écrit l'état du monde et des joueurs de World. */
	bool SaveToSlot(UWorld* World, int32 Slot);

	/** Serveur : relit un emplacement et l'applique au monde en cours (même map). */
	bool LoadFromSlot(UWorld* World, int32 Slot);

	/** Sauvegarde automatique (délai minimal 1 s ; jamais après la mort). */
	bool AutoSave(UWorld* World, const FString& Reason);

	UFUNCTION(BlueprintPure, Category = "Sauvegarde")
	bool HasSlot(int32 Slot) const;

	UFUNCTION(BlueprintPure, Category = "Sauvegarde")
	bool HasAnySave() const;

	/** Emplacement le plus récent (-1 si aucun). */
	UFUNCTION(BlueprintPure, Category = "Sauvegarde")
	int32 LatestSlot() const;

	UFUNCTION(BlueprintCallable, Category = "Sauvegarde")
	UBWSaveGame* ReadSlot(int32 Slot) const;

private:
	double LastAutoSaveTime = -1000.0;
};
