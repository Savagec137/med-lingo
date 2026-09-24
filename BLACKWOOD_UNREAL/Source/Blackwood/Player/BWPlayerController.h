// Contrôleur du joueur : entrées Enhanced Input (contexte construit par le code), limites de la
// caméra, surimpression de débogage (F3) et commandes de test (équivalent de la console F1 de
// Godot : god, give, flag, tp, save, load…). Les commandes qui changent le monde passent par
// des RPC serveur : elles fonctionnent aussi en coop.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "BWPlayerController.generated.h"

class UBWInputConfig;

UCLASS()
class BLACKWOOD_API ABWPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	ABWPlayerController();

	virtual void BeginPlay() override;
	virtual void SetupInputComponent() override;

	/** Actions et contexte d'entrée de ce joueur (créés à la première demande). */
	UBWInputConfig* GetInputConfig() const;

	// --- Commandes de test (console : ~ ou ²) ------------------------------------------------

	/** BWFlag has_flashlight 1 : pose (1) ou retire (0) un drapeau de progression. */
	UFUNCTION(Exec)
	void BWFlag(const FString& Flag, int32 bValue = 1);

	/** BWGive ammo_9mm 12 : donne un objet ou une arme. */
	UFUNCTION(Exec)
	void BWGive(const FString& ItemId, int32 Count = 1);

	/** BWSave 1 / BWLoad 1 : sauvegarde et chargement (0 = automatique, 1 à 3 = manuels). */
	UFUNCTION(Exec)
	void BWSave(int32 Slot = 1);

	UFUNCTION(Exec)
	void BWLoad(int32 Slot = 1);

	/** BWTp 38.2 -4 -7.8 : téléportation aux coordonnées GODOT (m, Y vers le haut). */
	UFUNCTION(Exec)
	void BWTp(float GodotX, float GodotY, float GodotZ);

	/** BWGod : invulnérabilité. */
	UFUNCTION(Exec)
	void BWGod();

	/** BWDifficulty 0|1|2. */
	UFUNCTION(Exec)
	void BWDifficulty(int32 Level);

protected:
	UFUNCTION(Server, Reliable)
	void ServerFlag(const FString& Flag, bool bValue);

	UFUNCTION(Server, Reliable)
	void ServerGive(const FString& ItemId, int32 Count);

	UFUNCTION(Server, Reliable)
	void ServerSave(int32 Slot);

	UFUNCTION(Server, Reliable)
	void ServerLoad(int32 Slot);

	UFUNCTION(Server, Reliable)
	void ServerTeleport(FVector Location);

	UFUNCTION(Server, Reliable)
	void ServerGod();

private:
	void ToggleDebugHUD();

	UPROPERTY()
	TObjectPtr<UBWInputConfig> InputConfig;
};
