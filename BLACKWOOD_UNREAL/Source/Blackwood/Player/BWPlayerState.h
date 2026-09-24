// Données d'UN joueur, répliquées (PlayerData de Godot) : santé, inventaire à 6 emplacements,
// armes et chargeurs, lampe torche, état « à terre » de la coopération.
// Objets PERSONNELS ici (munitions, soins, piles, armes) ; objets PARTAGÉS (clés, cartes,
// fusible) sur le porte-clés commun d'ABWGameState. Seul le serveur modifie ces données.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerState.h"
#include "Core/BWTypes.h"
#include "BWPlayerState.generated.h"

struct FBWPlayerSave;
class UBWItemDefinition;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FBWPlayerDataChangedSignature);

UCLASS()
class BLACKWOOD_API ABWPlayerState : public APlayerState
{
	GENERATED_BODY()

public:
	ABWPlayerState();

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

	static constexpr int32 InventorySlots = 6;
	static constexpr float MaxHealth = 100.f;
	/** Coop : temps à terre avant la mort (s) et santé après réanimation. */
	static constexpr float BleedTime = 30.f;
	static constexpr float ReviveHealth = 25.f;
	/** Batterie de la lampe : % par seconde (100 % ≈ 16 min). */
	static constexpr float FlashlightDrainPerSecond = 0.1f;

	// --- Lecture (tous) -------------------------------------------------------------------

	UFUNCTION(BlueprintPure, Category = "Joueur")
	float GetHealth() const { return Health; }

	UFUNCTION(BlueprintPure, Category = "Joueur")
	EBWLifeState GetLifeState() const { return LifeState; }

	UFUNCTION(BlueprintPure, Category = "Joueur")
	bool IsActive() const { return LifeState == EBWLifeState::Alive; }

	UFUNCTION(BlueprintPure, Category = "Inventaire")
	TArray<FBWItemStack> GetInventory() const { return Inventory; }

	UFUNCTION(BlueprintPure, Category = "Inventaire")
	int32 CountItem(FName ItemId) const;

	/** Objet possédé par ce joueur (inventaire seulement ; le porte-clés est dans le GameState). */
	UFUNCTION(BlueprintPure, Category = "Inventaire")
	bool HasItem(FName ItemId) const { return CountItem(ItemId) > 0; }

	UFUNCTION(BlueprintPure, Category = "Inventaire")
	int32 FreeSlots() const;

	/** L'objet peut-il entrer entièrement (clés : toujours) ? */
	UFUNCTION(BlueprintPure, Category = "Inventaire")
	bool CanAdd(FName ItemId, int32 Count = 1) const;

	UFUNCTION(BlueprintPure, Category = "Armes")
	TArray<FBWWeaponState> GetWeapons() const { return Weapons; }

	UFUNCTION(BlueprintPure, Category = "Armes")
	bool HasWeapon(FName WeaponId) const;

	UFUNCTION(BlueprintPure, Category = "Armes")
	int32 GetWeaponMag(FName WeaponId) const;

	/** Munitions de réserve (dans l'inventaire) pour l'arme. */
	UFUNCTION(BlueprintPure, Category = "Armes")
	int32 GetWeaponReserve(FName WeaponId) const;

	UFUNCTION(BlueprintPure, Category = "Armes")
	FName GetEquipped() const { return Equipped; }

	UFUNCTION(BlueprintPure, Category = "Lampe")
	bool IsFlashlightOn() const { return bFlashlightOn; }

	UFUNCTION(BlueprintPure, Category = "Lampe")
	float GetFlashlightBattery() const { return FlashlightBattery; }

	// --- Modification (serveur) ------------------------------------------------------------

	void SetHealth(float NewHealth);
	void ApplyDamage(float Amount);
	void Heal(float Amount);

	/** Ajoute un objet ; les clés vont au porte-clés commun. Renvoie la quantité non rangée. */
	int32 AddItem(FName ItemId, int32 Count = 1);
	bool RemoveItem(FName ItemId, int32 Count = 1);

	void GiveWeapon(FName WeaponId, bool bLoaded = true);
	void SetWeaponMag(FName WeaponId, int32 Mag);
	void SetEquipped(FName WeaponId);

	void SetFlashlightOn(bool bOn);
	void SetFlashlightBattery(float Percent);
	void DrainFlashlight(float DeltaSeconds);

	void SetLifeState(EBWLifeState NewState);

	void WriteToSave(FBWPlayerSave& Out) const;
	void ReadFromSave(const FBWPlayerSave& In);

	/** 1 = hôte / solo, 2 = invité. */
	UPROPERTY(Replicated, BlueprintReadOnly, Category = "Joueur")
	int32 PlayerSlot = 1;

	UPROPERTY(BlueprintAssignable, Category = "Joueur")
	FBWPlayerDataChangedSignature OnHealthChanged;

	UPROPERTY(BlueprintAssignable, Category = "Inventaire")
	FBWPlayerDataChangedSignature OnInventoryChanged;

	UPROPERTY(BlueprintAssignable, Category = "Armes")
	FBWPlayerDataChangedSignature OnWeaponsChanged;

	UPROPERTY(BlueprintAssignable, Category = "Lampe")
	FBWPlayerDataChangedSignature OnFlashlightChanged;

	UPROPERTY(BlueprintAssignable, Category = "Joueur")
	FBWPlayerDataChangedSignature OnLifeStateChanged;

protected:
	UPROPERTY(ReplicatedUsing = OnRep_Health)
	float Health = MaxHealth;

	UPROPERTY(ReplicatedUsing = OnRep_Inventory)
	TArray<FBWItemStack> Inventory;

	UPROPERTY(ReplicatedUsing = OnRep_Weapons)
	TArray<FBWWeaponState> Weapons;

	UPROPERTY(ReplicatedUsing = OnRep_Weapons)
	FName Equipped;

	UPROPERTY(ReplicatedUsing = OnRep_Flashlight)
	bool bFlashlightOn = false;

	UPROPERTY(ReplicatedUsing = OnRep_Flashlight)
	float FlashlightBattery = 100.f;

	UPROPERTY(ReplicatedUsing = OnRep_LifeState)
	EBWLifeState LifeState = EBWLifeState::Alive;

	UPROPERTY(Replicated)
	float BleedTimer = 0.f;

	UFUNCTION()
	void OnRep_Health();

	UFUNCTION()
	void OnRep_Inventory();

	UFUNCTION()
	void OnRep_Weapons();

	UFUNCTION()
	void OnRep_Flashlight();

	UFUNCTION()
	void OnRep_LifeState();

private:
	const UBWItemDefinition* FindItemDef(FName ItemId) const;
	int32 MaxStackOf(FName ItemId) const;
	bool IsKey(FName ItemId) const;
	void ResetInventory();
	void NotifyObjective() const;
};
