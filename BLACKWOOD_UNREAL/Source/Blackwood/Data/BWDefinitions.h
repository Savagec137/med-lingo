// Définitions de données (Data Assets) : objets, armes, ennemis, documents.
// Valeurs importées de blackwood/data/ et blackwood/enemies/ par Scripts/import_all.py
// (fichier source : SourceData/data.json).
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Core/BWTypes.h"
#include "BWDefinitions.generated.h"

class UStaticMesh;

/** Un objet du catalogue (ItemDB). */
UCLASS(BlueprintType)
class BLACKWOOD_API UBWItemDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	FName ItemId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	EBWItemKind Kind = EBWItemKind::Key;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet", meta = (ClampMin = "1"))
	int32 MaxStack = 1;

	/** Nom de l'icône (ui/item_icon.gd). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	FName Icon;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet", meta = (MultiLine = "true"))
	FText Description;

	/** Points de vie rendus (objets de soin). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	float HealAmount = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Objet")
	TSoftObjectPtr<UStaticMesh> Mesh;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override { return FPrimaryAssetId(TEXT("BWItem"), ItemId); }
};

/** Une arme (WeaponDB). Distances en mètres, comme dans Godot (converties à l'usage). */
UCLASS(BlueprintType)
class BLACKWOOD_API UBWWeaponDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	FName WeaponId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	FText ShortName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	EBWWeaponKind Kind = EBWWeaponKind::Hitscan;

	/** Objet munition (vide : arme sans munitions). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	FName AmmoItem;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	int32 MagSize = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	int32 Pellets = 1;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Damage = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float HeadMultiplier = 1.f;

	/** Temps entre deux tirs (s). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Interval = 0.3f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float ReloadTime = 0.f;

	/** Rechargement cartouche par cartouche (fusil à pompe). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	bool bReloadOneByOne = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	bool bAutomatic = false;

	/** Traverse les cibles (magnum). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	bool bPierce = false;

	/** Dispersion en visée / à la hanche (degrés). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float SpreadAim = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float SpreadHip = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float SpreadGrowth = 0.f;

	/** Portée (m). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Range = 0.f;

	/** Rayon du bruit qui attire les créatures (m). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Noise = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Recoil = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Shake = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Stagger = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Knockback = 0.f;

	/** Mêlée : allonge (m) et arc (degrés). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Reach = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme")
	float Arc = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Arme", meta = (MultiLine = "true"))
	FText Description;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override { return FPrimaryAssetId(TEXT("BWWeapon"), WeaponId); }
};

/** Profil d'ennemi (statistiques relevées dans les scripts de blackwood/enemies/). Distances en mètres. */
UCLASS(BlueprintType)
class BLACKWOOD_API UBWEnemyDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	/** « hollow_nurse », « veilleur », « surgeon »… */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	FName ProfileId;

	/** Classe Godot d'origine (Hollow, Veilleur, Surgeon…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	FName GodotClass;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float MaxHealth = 100.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float WalkSpeed = 1.1f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float ChaseSpeed = 2.4f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float TurnSpeed = 6.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float AttackRange = 1.5f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float AttackDamage = 18.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float AttackWindup = 0.55f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float AttackRecovery = 0.7f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float HearingScale = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float VisionRange = 7.f;

	/** Portée de vision quand le joueur est éclairé (lampe). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float VisionRangeLit = 11.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float Proximity = 2.2f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float LoseTime = 5.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float SearchTime = 10.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float GiveUpDistance = 24.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float PatrolWait = 2.5f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float StaggerChance = 0.6f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float BodyRadius = 0.35f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float BodyHeight = 1.75f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ennemi")
	float WakeRadius = 3.2f;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override { return FPrimaryAssetId(TEXT("BWEnemy"), ProfileId); }
};

/** Un document lisible (DocumentDB). */
UCLASS(BlueprintType)
class BLACKWOOD_API UBWDocumentDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Document")
	FName DocId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Document")
	FText Title;

	/** « typed » (imprimé) ou « hand » (manuscrit). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Document")
	FName Style;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Document", meta = (MultiLine = "true"))
	FText Body;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override { return FPrimaryAssetId(TEXT("BWDocument"), DocId); }
};
