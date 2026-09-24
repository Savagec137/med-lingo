// État du monde, répliqué à tous les joueurs (partie « monde » du GameState Godot) :
// drapeaux de progression, porte-clés commun, documents, portes, objets pris, ennemis morts,
// zone courante, temps de jeu, compte à rebours. Seul le serveur le modifie.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "Core/BWTypes.h"
#include "BWGameState.generated.h"

struct FBWWorldSave;
class ABWPlayerState;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBWFlagChangedSignature, FName, Flag, bool, bValue);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FBWWorldChangedSignature);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FBWNameSignature, FName, Id);

UCLASS()
class BLACKWOOD_API ABWGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	ABWGameState();

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
	virtual void Tick(float DeltaSeconds) override;

	// --- Drapeaux de progression ------------------------------------------------------

	/** Serveur : pose ou retire un drapeau (« nurse_seen », « power_restored »…). */
	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Progression")
	void SetFlag(FName Flag, bool bValue = true);

	UFUNCTION(BlueprintPure, Category = "Progression")
	bool GetFlag(FName Flag) const { return Flags.Contains(Flag); }

	UFUNCTION(BlueprintPure, Category = "Progression")
	TArray<FName> GetAllFlags() const { return Flags; }

	// --- Porte-clés commun (clés, cartes, fusible) --------------------------------------

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Inventaire")
	void AddKey(FName ItemId);

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Inventaire")
	bool RemoveKey(FName ItemId);

	UFUNCTION(BlueprintPure, Category = "Inventaire")
	bool HasKey(FName ItemId) const { return KeyRing.Contains(ItemId); }

	UFUNCTION(BlueprintPure, Category = "Inventaire")
	TArray<FName> GetKeyRing() const { return KeyRing; }

	// --- Documents -------------------------------------------------------------------

	/** Serveur : ajoute un document ; faux s'il était déjà lu. */
	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Documents")
	bool AddDocument(FName DocId);

	UFUNCTION(BlueprintPure, Category = "Documents")
	bool HasDocument(FName DocId) const { return Documents.Contains(DocId); }

	UFUNCTION(BlueprintPure, Category = "Documents")
	TArray<FName> GetDocuments() const { return Documents; }

	// --- Monde : objets pris, ennemis morts, portes ---------------------------------------

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Monde")
	void MarkPickupTaken(FName PickupId);

	UFUNCTION(BlueprintPure, Category = "Monde")
	bool IsPickupTaken(FName PickupId) const { return TakenPickups.Contains(PickupId); }

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Monde")
	void MarkEnemyDead(FName SpawnId);

	UFUNCTION(BlueprintPure, Category = "Monde")
	bool IsEnemyDead(FName SpawnId) const { return DeadEnemies.Contains(SpawnId); }

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Monde")
	void SetDoorState(const FBWDoorState& State);

	/** Faux si la porte n'a jamais changé d'état (état initial du niveau). */
	UFUNCTION(BlueprintPure, Category = "Monde")
	bool FindDoorState(FName DoorId, FBWDoorState& OutState) const;

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Monde")
	void SetCurrentZone(FName Zone);

	UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category = "Monde")
	void SetCountdown(float Seconds);

	/** Serveur : un joueur est entré dans un déclencheur (le scénario écoute OnTriggerFired). */
	void NotifyTrigger(FName TriggerName);

	// --- Objectif ------------------------------------------------------------------------

	/** Texte de l'objectif pour le joueur local (règles de data/objectives.gd). */
	UFUNCTION(BlueprintPure, Category = "Progression")
	FText GetObjectiveText() const;

	/** Recalcule l'objectif et diffuse OnObjectiveChanged s'il a changé. */
	void RefreshObjective();

	// --- Sauvegarde ---------------------------------------------------------------------

	void WriteToSave(FBWWorldSave& Out) const;
	void ReadFromSave(const FBWWorldSave& In);

	// --- Événements (équivalents des signaux Godot) ------------------------------------------

	UPROPERTY(BlueprintAssignable, Category = "Progression")
	FBWFlagChangedSignature OnFlagChanged;

	UPROPERTY(BlueprintAssignable, Category = "Inventaire")
	FBWWorldChangedSignature OnKeyRingChanged;

	UPROPERTY(BlueprintAssignable, Category = "Documents")
	FBWNameSignature OnDocumentCollected;

	/** Serveur uniquement : nom du déclencheur franchi. */
	UPROPERTY(BlueprintAssignable, Category = "Monde")
	FBWNameSignature OnTriggerFired;

	UPROPERTY(BlueprintAssignable, Category = "Monde")
	FBWNameSignature OnZoneChanged;

	UPROPERTY(BlueprintAssignable, Category = "Progression")
	FBWWorldChangedSignature OnObjectiveChanged;

	/** Temps de jeu (s). */
	UPROPERTY(Replicated, BlueprintReadOnly, Category = "Monde")
	float Playtime = 0.f;

	/** Zone du joueur hôte (identifiant Godot : « b1_bay », « f0_hall »…). */
	UPROPERTY(ReplicatedUsing = OnRep_CurrentZone, BlueprintReadOnly, Category = "Monde")
	FName CurrentZone;

	/** Autodestruction : secondes restantes (-1 : inactive). */
	UPROPERTY(Replicated, BlueprintReadOnly, Category = "Monde")
	float Countdown = -1.f;

protected:
	UPROPERTY(ReplicatedUsing = OnRep_Flags)
	TArray<FName> Flags;

	UPROPERTY(ReplicatedUsing = OnRep_KeyRing)
	TArray<FName> KeyRing;

	UPROPERTY(ReplicatedUsing = OnRep_Documents)
	TArray<FName> Documents;

	UPROPERTY(Replicated)
	TArray<FName> TakenPickups;

	UPROPERTY(Replicated)
	TArray<FName> DeadEnemies;

	UPROPERTY(Replicated)
	TArray<FBWDoorState> DoorStates;

	UFUNCTION()
	void OnRep_Flags(const TArray<FName>& OldFlags);

	UFUNCTION()
	void OnRep_KeyRing();

	UFUNCTION()
	void OnRep_Documents(const TArray<FName>& OldDocuments);

	UFUNCTION()
	void OnRep_CurrentZone();

private:
	const ABWPlayerState* GetLocalPlayerState() const;

	int32 LastObjectiveIndex = INDEX_NONE;
};
