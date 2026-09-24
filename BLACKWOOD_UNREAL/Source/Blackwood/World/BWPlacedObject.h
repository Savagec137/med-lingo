// Objet placé du niveau Godot (porte, objet à ramasser, luminaire, panneau, coffre…) tel que
// l'extracteur l'a relevé : ses pièces (maillage + transformation, pièces mobiles des portes),
// ses boîtes de collision et ses propriétés Godot d'origine. Les comportements (ouvrir, ramasser,
// allumer…) sont ajoutés étape par étape par des classes dérivées (voir MIGRATION_MATRIX.md).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BWPlacedObject.generated.h"

class UStaticMesh;
class UStaticMeshComponent;

/** Boîte de collision (demi-dimensions en cm, dans le repère de la pièce). */
USTRUCT(BlueprintType)
struct FBWCollisionBox
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Collision")
	FTransform Local;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Collision")
	FVector Extent = FVector(10.0);
};

/** Pièce d'un objet : « base » ou pièce mobile (vantail de porte). */
USTRUCT(BlueprintType)
struct FBWPlacedPart
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pièce")
	FName Name;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pièce")
	TObjectPtr<UStaticMesh> Mesh;

	/** Transformation relative à l'objet (pivot de la pièce mobile). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pièce")
	FTransform Local;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pièce")
	bool bMover = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pièce")
	TArray<FBWCollisionBox> Boxes;
};

UCLASS()
class BLACKWOOD_API ABWPlacedObject : public AActor
{
	GENERATED_BODY()

public:
	ABWPlacedObject();

	virtual void OnConstruction(const FTransform& Transform) override;

	/** Classe Godot d'origine (Door, Pickup, LightFixture…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot")
	FName GodotClass;

	/** Identifiant stable (door_id, pickup_id…), utilisé par la sauvegarde et le scénario. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot")
	FName ObjectId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot")
	FName Zone;

	/** Propriétés du script Godot (JSON) : textes, verrous, codes, contenus… */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot", meta = (MultiLine = "true"))
	FString PropertiesJson;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot")
	TArray<FBWPlacedPart> Parts;

	/** Collision des pièces mobiles (désactivée tant que le comportement n'existe pas : une
	 *  porte qu'on ne peut pas ouvrir ne doit pas bloquer la progression). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Godot")
	bool bMoverCollision = false;

	UFUNCTION(BlueprintPure, Category = "Godot")
	USceneComponent* GetPartRoot(int32 Index) const;

	/** Lit une propriété Godot de PropertiesJson (texte ; vide si absente). */
	UFUNCTION(BlueprintPure, Category = "Godot")
	FString GetGodotProperty(const FString& Name) const;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Godot")
	TObjectPtr<USceneComponent> Root;

	UPROPERTY()
	TArray<TObjectPtr<USceneComponent>> PartRoots;

	UPROPERTY()
	TArray<TObjectPtr<UStaticMeshComponent>> PartMeshes;
};
