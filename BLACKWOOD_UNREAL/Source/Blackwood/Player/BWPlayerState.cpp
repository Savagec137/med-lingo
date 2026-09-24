#include "Player/BWPlayerState.h"
#include "Game/BWGameState.h"
#include "Data/BWGameData.h"
#include "Data/BWDefinitions.h"
#include "Save/BWSaveGame.h"
#include "Engine/World.h"
#include "Net/UnrealNetwork.h"

ABWPlayerState::ABWPlayerState()
{
	ResetInventory();
}

void ABWPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(ABWPlayerState, PlayerSlot);
	DOREPLIFETIME(ABWPlayerState, Health);
	DOREPLIFETIME(ABWPlayerState, Inventory);
	DOREPLIFETIME(ABWPlayerState, Weapons);
	DOREPLIFETIME(ABWPlayerState, Equipped);
	DOREPLIFETIME(ABWPlayerState, bFlashlightOn);
	DOREPLIFETIME(ABWPlayerState, FlashlightBattery);
	DOREPLIFETIME(ABWPlayerState, LifeState);
	DOREPLIFETIME(ABWPlayerState, BleedTimer);
}

void ABWPlayerState::ResetInventory()
{
	Inventory.Reset();
	Inventory.SetNum(InventorySlots);
}

const UBWItemDefinition* ABWPlayerState::FindItemDef(FName ItemId) const
{
	const UBWGameData* Data = UBWGameData::Get(this);
	return Data ? Data->FindItem(ItemId) : nullptr;
}

int32 ABWPlayerState::MaxStackOf(FName ItemId) const
{
	const UBWItemDefinition* Def = FindItemDef(ItemId);
	return Def ? FMath::Max(Def->MaxStack, 1) : 1;
}

bool ABWPlayerState::IsKey(FName ItemId) const
{
	// Comme ItemDB.get_item : un identifiant inconnu est traité comme une clé.
	const UBWItemDefinition* Def = FindItemDef(ItemId);
	return !Def || Def->Kind == EBWItemKind::Key;
}

void ABWPlayerState::NotifyObjective() const
{
	if (ABWGameState* GS = GetWorld() ? GetWorld()->GetGameState<ABWGameState>() : nullptr)
	{
		GS->RefreshObjective();
	}
}

// --- Santé ------------------------------------------------------------------------------------

void ABWPlayerState::SetHealth(float NewHealth)
{
	if (!HasAuthority())
	{
		return;
	}
	Health = FMath::Clamp(NewHealth, 0.f, MaxHealth);
	OnHealthChanged.Broadcast();
}

void ABWPlayerState::ApplyDamage(float Amount)
{
	if (Amount > 0.f && LifeState == EBWLifeState::Alive)
	{
		SetHealth(Health - Amount);
	}
}

void ABWPlayerState::Heal(float Amount)
{
	if (Amount > 0.f && LifeState == EBWLifeState::Alive)
	{
		SetHealth(Health + Amount);
	}
}

void ABWPlayerState::OnRep_Health()
{
	OnHealthChanged.Broadcast();
}

// --- Inventaire (même algorithme que PlayerData.add_item / can_add / remove_item) ------------

int32 ABWPlayerState::CountItem(FName ItemId) const
{
	int32 Total = 0;
	for (const FBWItemStack& S : Inventory)
	{
		if (S.ItemId == ItemId)
		{
			Total += S.Count;
		}
	}
	return Total;
}

int32 ABWPlayerState::FreeSlots() const
{
	int32 N = 0;
	for (const FBWItemStack& S : Inventory)
	{
		if (S.ItemId.IsNone())
		{
			++N;
		}
	}
	return N;
}

bool ABWPlayerState::CanAdd(FName ItemId, int32 Count) const
{
	if (IsKey(ItemId))
	{
		return true;
	}
	const int32 Stack = MaxStackOf(ItemId);
	int32 Space = 0;
	for (const FBWItemStack& S : Inventory)
	{
		if (S.ItemId == ItemId)
		{
			Space += Stack - S.Count;
		}
		else if (S.ItemId.IsNone())
		{
			Space += Stack;
		}
	}
	return Space >= Count;
}

int32 ABWPlayerState::AddItem(FName ItemId, int32 Count)
{
	if (!HasAuthority() || ItemId.IsNone() || Count <= 0)
	{
		return Count;
	}
	if (IsKey(ItemId))
	{
		if (ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>())
		{
			GS->AddKey(ItemId);
		}
		return 0;
	}
	int32 Remaining = Count;
	const int32 Stack = MaxStackOf(ItemId);
	// 1) compléter les piles existantes
	for (FBWItemStack& S : Inventory)
	{
		if (Remaining <= 0)
		{
			break;
		}
		if (S.ItemId == ItemId && S.Count < Stack)
		{
			const int32 Add = FMath::Min(Stack - S.Count, Remaining);
			S.Count += Add;
			Remaining -= Add;
		}
	}
	// 2) emplacements libres
	for (FBWItemStack& S : Inventory)
	{
		if (Remaining <= 0)
		{
			break;
		}
		if (S.ItemId.IsNone())
		{
			const int32 Add = FMath::Min(Stack, Remaining);
			S.ItemId = ItemId;
			S.Count = Add;
			Remaining -= Add;
		}
	}
	OnInventoryChanged.Broadcast();
	NotifyObjective();
	return Remaining;
}

bool ABWPlayerState::RemoveItem(FName ItemId, int32 Count)
{
	if (!HasAuthority())
	{
		return false;
	}
	if (IsKey(ItemId))
	{
		ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>();
		return GS && GS->RemoveKey(ItemId);
	}
	if (CountItem(ItemId) < Count)
	{
		return false;
	}
	int32 Remaining = Count;
	// Comme Godot : on vide en partant du dernier emplacement
	for (int32 i = Inventory.Num() - 1; i >= 0 && Remaining > 0; --i)
	{
		FBWItemStack& S = Inventory[i];
		if (S.ItemId != ItemId)
		{
			continue;
		}
		const int32 Take = FMath::Min(S.Count, Remaining);
		S.Count -= Take;
		Remaining -= Take;
		if (S.Count <= 0)
		{
			S = FBWItemStack();
		}
	}
	OnInventoryChanged.Broadcast();
	NotifyObjective();
	return true;
}

void ABWPlayerState::OnRep_Inventory()
{
	OnInventoryChanged.Broadcast();
	NotifyObjective();
}

// --- Armes -------------------------------------------------------------------------------------

bool ABWPlayerState::HasWeapon(FName WeaponId) const
{
	return Weapons.ContainsByPredicate([WeaponId](const FBWWeaponState& W) { return W.WeaponId == WeaponId; });
}

int32 ABWPlayerState::GetWeaponMag(FName WeaponId) const
{
	const FName Id = WeaponId.IsNone() ? Equipped : WeaponId;
	for (const FBWWeaponState& W : Weapons)
	{
		if (W.WeaponId == Id)
		{
			return W.Mag;
		}
	}
	return 0;
}

int32 ABWPlayerState::GetWeaponReserve(FName WeaponId) const
{
	const FName Id = WeaponId.IsNone() ? Equipped : WeaponId;
	const UBWGameData* Data = UBWGameData::Get(this);
	const UBWWeaponDefinition* Def = Data ? Data->FindWeapon(Id) : nullptr;
	return (Def && !Def->AmmoItem.IsNone()) ? CountItem(Def->AmmoItem) : 0;
}

void ABWPlayerState::GiveWeapon(FName WeaponId, bool bLoaded)
{
	if (!HasAuthority())
	{
		return;
	}
	const UBWGameData* Data = UBWGameData::Get(this);
	const UBWWeaponDefinition* Def = Data ? Data->FindWeapon(WeaponId) : nullptr;
	if (!Def)
	{
		return;
	}
	if (!HasWeapon(WeaponId))
	{
		FBWWeaponState W;
		W.WeaponId = WeaponId;
		W.Mag = bLoaded ? Def->MagSize : 0;
		Weapons.Add(W);
	}
	if (Equipped.IsNone())
	{
		Equipped = WeaponId;
	}
	OnWeaponsChanged.Broadcast();
}

void ABWPlayerState::SetWeaponMag(FName WeaponId, int32 Mag)
{
	if (!HasAuthority())
	{
		return;
	}
	for (FBWWeaponState& W : Weapons)
	{
		if (W.WeaponId == WeaponId)
		{
			W.Mag = FMath::Max(Mag, 0);
			OnWeaponsChanged.Broadcast();
			return;
		}
	}
}

void ABWPlayerState::SetEquipped(FName WeaponId)
{
	if (HasAuthority() && (WeaponId.IsNone() || HasWeapon(WeaponId)))
	{
		Equipped = WeaponId;
		OnWeaponsChanged.Broadcast();
	}
}

void ABWPlayerState::OnRep_Weapons()
{
	OnWeaponsChanged.Broadcast();
}

// --- Lampe torche ------------------------------------------------------------------------------

void ABWPlayerState::SetFlashlightOn(bool bOn)
{
	if (HasAuthority())
	{
		bFlashlightOn = bOn && FlashlightBattery > 0.f;
		OnFlashlightChanged.Broadcast();
	}
}

void ABWPlayerState::SetFlashlightBattery(float Percent)
{
	if (HasAuthority())
	{
		FlashlightBattery = FMath::Clamp(Percent, 0.f, 100.f);
		if (FlashlightBattery <= 0.f)
		{
			bFlashlightOn = false;
		}
		OnFlashlightChanged.Broadcast();
	}
}

void ABWPlayerState::DrainFlashlight(float DeltaSeconds)
{
	if (HasAuthority() && bFlashlightOn)
	{
		const float Before = FlashlightBattery;
		FlashlightBattery = FMath::Max(FlashlightBattery - FlashlightDrainPerSecond * DeltaSeconds, 0.f);
		if (FlashlightBattery <= 0.f)
		{
			bFlashlightOn = false;
		}
		// Notifie par pas de 1 % (évite une diffusion à chaque image)
		if (FMath::FloorToInt(Before) != FMath::FloorToInt(FlashlightBattery) || !bFlashlightOn)
		{
			OnFlashlightChanged.Broadcast();
		}
	}
}

void ABWPlayerState::OnRep_Flashlight()
{
	OnFlashlightChanged.Broadcast();
}

// --- État (coop : à terre, mort) ------------------------------------------------------------------

void ABWPlayerState::SetLifeState(EBWLifeState NewState)
{
	if (!HasAuthority() || NewState == LifeState)
	{
		return;
	}
	LifeState = NewState;
	BleedTimer = (NewState == EBWLifeState::Downed) ? BleedTime : 0.f;
	OnLifeStateChanged.Broadcast();
}

void ABWPlayerState::OnRep_LifeState()
{
	OnLifeStateChanged.Broadcast();
}

// --- Sauvegarde -------------------------------------------------------------------------------------

void ABWPlayerState::WriteToSave(FBWPlayerSave& Out) const
{
	Out.PlayerSlot = PlayerSlot;
	Out.Health = Health;
	Out.Inventory = Inventory;
	Out.Weapons = Weapons;
	Out.Equipped = Equipped;
	Out.bFlashlightOn = bFlashlightOn;
	Out.FlashlightBattery = FlashlightBattery;
	Out.LifeState = LifeState;
	Out.BleedTime = BleedTimer;
}

void ABWPlayerState::ReadFromSave(const FBWPlayerSave& In)
{
	if (!HasAuthority())
	{
		return;
	}
	Health = FMath::Clamp(In.Health, 0.f, MaxHealth);
	ResetInventory();
	for (int32 i = 0; i < FMath::Min(In.Inventory.Num(), InventorySlots); ++i)
	{
		Inventory[i] = In.Inventory[i];
	}
	Weapons = In.Weapons;
	Equipped = In.Equipped;
	bFlashlightOn = In.bFlashlightOn;
	FlashlightBattery = In.FlashlightBattery;
	LifeState = In.LifeState;
	BleedTimer = In.BleedTime;
	OnHealthChanged.Broadcast();
	OnInventoryChanged.Broadcast();
	OnWeaponsChanged.Broadcast();
	OnFlashlightChanged.Broadcast();
	OnLifeStateChanged.Broadcast();
}
