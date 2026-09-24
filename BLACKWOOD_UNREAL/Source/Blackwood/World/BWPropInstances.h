// Accessoires instanciés (Geo.stamp / MultiMesh de Godot) : un modèle, toutes ses copies d'une
// zone. Rendu par instanciation (un appel de dessin), sans collision propre : les volumes de
// collision des accessoires sont dans le maillage de collision de l'étage, comme dans Godot.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BWPropInstances.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

UCLASS()
class BLACKWOOD_API ABWPropInstances : public AActor
{
	GENERATED_BODY()

public:
	ABWPropInstances();

	virtual void OnConstruction(const FTransform& Transform) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Accessoires")
	TObjectPtr<UInstancedStaticMeshComponent> Instances;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessoires")
	TObjectPtr<UStaticMesh> Mesh;

	/** Transformations des copies (repère de l'acteur). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessoires")
	TArray<FTransform> InstanceTransforms;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessoires")
	bool bCastShadow = true;

	/** Modèle Godot (« wheelchair », « gurney »…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessoires")
	FName Template;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessoires")
	FName Zone;
};
