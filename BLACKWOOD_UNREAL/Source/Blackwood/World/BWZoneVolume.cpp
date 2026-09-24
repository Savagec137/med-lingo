#include "World/BWZoneVolume.h"
#include "Player/BWCharacter.h"
#include "Components/BoxComponent.h"

ABWZoneVolume::ABWZoneVolume()
{
	PrimaryActorTick.bCanEverTick = false;
	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	RootComponent = Box;
	Box->SetCollisionProfileName(TEXT("Trigger"));
	Box->SetGenerateOverlapEvents(true);
	Box->SetCanEverAffectNavigation(false);
	Box->ShapeColor = FColor(80, 160, 255);
}

void ABWZoneVolume::BeginPlay()
{
	Super::BeginPlay();
	Box->OnComponentBeginOverlap.AddDynamic(this, &ABWZoneVolume::OnBoxBeginOverlap);
}

void ABWZoneVolume::OnBoxBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp,
	int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (ABWCharacter* Thomas = Cast<ABWCharacter>(OtherActor))
	{
		Thomas->EnterZone(ZoneId, Surface);
	}
}
