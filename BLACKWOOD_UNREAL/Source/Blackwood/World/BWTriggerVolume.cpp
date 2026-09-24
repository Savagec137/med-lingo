#include "World/BWTriggerVolume.h"
#include "Player/BWCharacter.h"
#include "Game/BWGameState.h"
#include "Components/BoxComponent.h"
#include "Engine/World.h"

ABWTriggerVolume::ABWTriggerVolume()
{
	PrimaryActorTick.bCanEverTick = false;
	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	RootComponent = Box;
	Box->SetCollisionProfileName(TEXT("Trigger"));
	Box->SetGenerateOverlapEvents(true);
	Box->SetCanEverAffectNavigation(false);
	Box->ShapeColor = FColor(255, 140, 40);
}

void ABWTriggerVolume::BeginPlay()
{
	Super::BeginPlay();
	// Le scénario ne tourne que sur le serveur (hôte), comme dans la version Godot
	if (HasAuthority())
	{
		Box->OnComponentBeginOverlap.AddDynamic(this, &ABWTriggerVolume::OnBoxBeginOverlap);
	}
}

void ABWTriggerVolume::OnBoxBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp,
	int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!Cast<ABWCharacter>(OtherActor) || (bOnce && bFired))
	{
		return;
	}
	ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>();
	if (!GS || (!RequiredFlag.IsNone() && !GS->GetFlag(RequiredFlag)))
	{
		return;
	}
	bFired = true;
	GS->NotifyTrigger(TriggerName);
}
