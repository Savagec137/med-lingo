#include "World/BWEnemySpawnPoint.h"
#include "Components/ArrowComponent.h"
#include "Components/CapsuleComponent.h"

ABWEnemySpawnPoint::ABWEnemySpawnPoint()
{
	PrimaryActorTick.bCanEverTick = false;
	Capsule = CreateDefaultSubobject<UCapsuleComponent>(TEXT("Capsule"));
	RootComponent = Capsule;
	Capsule->InitCapsuleSize(35.f, 90.f);
	Capsule->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Capsule->SetCanEverAffectNavigation(false);
	Capsule->SetHiddenInGame(true);
	Capsule->ShapeColor = FColor(220, 40, 40);
	Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Capsule);
	Arrow->ArrowColor = FColor(220, 40, 40);
	Arrow->SetHiddenInGame(true);
	SetActorHiddenInGame(true);
}
