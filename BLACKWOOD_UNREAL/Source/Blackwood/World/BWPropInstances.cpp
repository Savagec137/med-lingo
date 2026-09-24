#include "World/BWPropInstances.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"

ABWPropInstances::ABWPropInstances()
{
	PrimaryActorTick.bCanEverTick = false;
	Instances = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Instances"));
	RootComponent = Instances;
	Instances->SetMobility(EComponentMobility::Static);
	Instances->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Instances->SetCanEverAffectNavigation(false);
}

void ABWPropInstances::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	Instances->SetStaticMesh(Mesh);
	Instances->SetCastShadow(bCastShadow);
	Instances->ClearInstances();
	for (const FTransform& T : InstanceTransforms)
	{
		Instances->AddInstance(T, false);
	}
}
