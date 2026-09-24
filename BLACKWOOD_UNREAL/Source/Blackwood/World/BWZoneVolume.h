// Zone du niveau (Facility.ZONES de Godot) : nom affiché, étage, surface des pas, mélange
// d'ambiances, réverbération. Placée par Scripts/import_all.py (un volume par rectangle de zone).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BWZoneVolume.generated.h"

class UBoxComponent;

UCLASS()
class BLACKWOOD_API ABWZoneVolume : public AActor
{
	GENERATED_BODY()

public:
	ABWZoneVolume();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Zone")
	TObjectPtr<UBoxComponent> Box;

	/** Identifiant Godot (« b1_bay », « f0_hall »…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	FName ZoneId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	int32 Floor = 0;

	/** Surface des pas : concrete, tile, lino, carpet, wood, metal, outdoor. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	FName Surface;

	/** Préréglage de réverbération : outdoor, room, corridor, hall, basement, tunnel. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	FName Reverb;

	/** Volume de chaque boucle d'ambiance (amb_hum, amb_rain…). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	TMap<FName, float> Ambience;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	bool bMoon = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Zone")
	bool bOutdoorLights = false;

protected:
	virtual void BeginPlay() override;

	UFUNCTION()
	void OnBoxBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp,
		int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);
};
