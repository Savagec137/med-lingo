// Déclencheur de scénario (TriggerZone de Godot) : quand un joueur y entre, le serveur
// diffuse son nom (ABWGameState::OnTriggerFired), une seule fois si « bOnce ».
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BWTriggerVolume.generated.h"

class UBoxComponent;

UCLASS()
class BLACKWOOD_API ABWTriggerVolume : public AActor
{
	GENERATED_BODY()

public:
	ABWTriggerVolume();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Déclencheur")
	TObjectPtr<UBoxComponent> Box;

	/** Nom Godot (« b1_nurse », « f3_arrive »…) : c'est lui que le scénario reconnaît. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Déclencheur")
	FName TriggerName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Déclencheur")
	bool bOnce = true;

	/** Drapeau exigé (vide : aucun). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Déclencheur")
	FName RequiredFlag;

protected:
	virtual void BeginPlay() override;

	UFUNCTION()
	void OnBoxBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp,
		int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

private:
	bool bFired = false;
};
