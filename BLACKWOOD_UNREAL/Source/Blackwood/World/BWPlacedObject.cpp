#include "World/BWPlacedObject.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/StaticMesh.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

ABWPlacedObject::ABWPlacedObject()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
}

void ABWPlacedObject::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	// Les composants créés ici sont des composants « de script de construction » : le moteur
	// les détruit avant chaque reconstruction (déplacement dans l'éditeur, changement de propriété).
	PartRoots.Reset();
	PartMeshes.Reset();
	for (int32 i = 0; i < Parts.Num(); ++i)
	{
		const FBWPlacedPart& Part = Parts[i];
		USceneComponent* PartRoot = NewObject<USceneComponent>(this,
			MakeUniqueObjectName(this, USceneComponent::StaticClass(), FName(*FString::Printf(TEXT("Part_%s"), *Part.Name.ToString()))));
		PartRoot->CreationMethod = EComponentCreationMethod::UserConstructionScript;
		PartRoot->SetupAttachment(Root);
		PartRoot->SetRelativeTransform(Part.Local);
		PartRoot->RegisterComponent();
		PartRoots.Add(PartRoot);

		const bool bCollide = !Part.bMover || bMoverCollision;
		if (Part.Mesh)
		{
			UStaticMeshComponent* MeshComp = NewObject<UStaticMeshComponent>(this,
				MakeUniqueObjectName(this, UStaticMeshComponent::StaticClass(), TEXT("PartMesh")));
			MeshComp->CreationMethod = EComponentCreationMethod::UserConstructionScript;
			MeshComp->SetupAttachment(PartRoot);
			MeshComp->SetStaticMesh(Part.Mesh);
			// Collisions : boîtes exportées de Godot (plus fidèles que le maillage visuel)
			MeshComp->SetCollisionEnabled(ECollisionEnabled::NoCollision);
			MeshComp->SetCanEverAffectNavigation(false);
			MeshComp->RegisterComponent();
			PartMeshes.Add(MeshComp);
		}
		for (const FBWCollisionBox& BoxDef : Part.Boxes)
		{
			UBoxComponent* BoxComp = NewObject<UBoxComponent>(this,
				MakeUniqueObjectName(this, UBoxComponent::StaticClass(), TEXT("PartBox")));
			BoxComp->CreationMethod = EComponentCreationMethod::UserConstructionScript;
			BoxComp->SetupAttachment(PartRoot);
			BoxComp->SetRelativeTransform(BoxDef.Local);
			BoxComp->SetBoxExtent(BoxDef.Extent);
			BoxComp->SetCollisionProfileName(bCollide ? TEXT("BlockAll") : TEXT("NoCollision"));
			BoxComp->SetCanEverAffectNavigation(bCollide);
			BoxComp->SetHiddenInGame(true);
			BoxComp->RegisterComponent();
		}
	}
}

USceneComponent* ABWPlacedObject::GetPartRoot(int32 Index) const
{
	return PartRoots.IsValidIndex(Index) ? PartRoots[Index].Get() : nullptr;
}

FString ABWPlacedObject::GetGodotProperty(const FString& Name) const
{
	TSharedPtr<FJsonObject> Json;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(PropertiesJson);
	if (!FJsonSerializer::Deserialize(Reader, Json) || !Json.IsValid())
	{
		return FString();
	}
	FString Value;
	if (Json->TryGetStringField(Name, Value))
	{
		return Value;
	}
	double Number = 0.0;
	if (Json->TryGetNumberField(Name, Number))
	{
		return FString::SanitizeFloat(Number);
	}
	bool bBool = false;
	if (Json->TryGetBoolField(Name, bBool))
	{
		return bBool ? TEXT("true") : TEXT("false");
	}
	return FString();
}
