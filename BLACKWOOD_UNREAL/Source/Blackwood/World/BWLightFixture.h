// Luminaire (blackwood/scripts/level/light_fixture.gd) : lumière ponctuelle ou projecteur,
// maillage émissif, comportements STEADY / FLICKER / BROKEN / PULSE / OFF, coupure du réseau
// électrique (éteint tant que le drapeau « power_restored » n'est pas posé), gyrophare.
#pragma once

#include "CoreMinimal.h"
#include "World/BWPlacedObject.h"
#include "Core/BWTypes.h"
#include "BWLightFixture.generated.h"

class ULocalLightComponent;
class UMaterialInstanceDynamic;

UCLASS()
class BLACKWOOD_API ABWLightFixture : public ABWPlacedObject
{
	GENERATED_BODY()

public:
	ABWLightFixture();

	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	bool bSpot = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	FLinearColor Color = FLinearColor::White;

	/** Énergie Godot (× LightIntensityScale des Paramètres du projet = candelas). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float Energy = 1.f;

	/** Portée (cm). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float Range = 800.f;

	/** Atténuation Godot (1 = linéaire ; plus grand = chute plus rapide). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float Attenuation = 1.f;

	/** Demi-angle du cône (degrés). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float SpotAngle = 45.f;

	/** Transformation de la lumière relative au luminaire. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	FTransform LightLocal;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	bool bCastShadows = false;

	/** Diffusion dans le brouillard volumétrique. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float FogScattering = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	EBWLightMode Mode = EBWLightMode::Steady;

	/** Sur le réseau principal : éteint jusqu'au retour du courant. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	bool bGridPowered = false;

	/** Coupure scriptée (Godot : power). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lumière")
	bool bPowered = true;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float EmissiveEnergy = 4.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	bool bBuzz = false;

	/** Gyrophare : rotation (rad/s). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lumière")
	float RotateSpeed = 0.f;

	UFUNCTION(BlueprintCallable, Category = "Lumière")
	void SetMode(EBWLightMode NewMode);

	UFUNCTION(BlueprintCallable, Category = "Lumière")
	void SetPowered(bool bOn);

	/** Couleur d'alerte (autodestruction : rouge pulsé). */
	UFUNCTION(BlueprintCallable, Category = "Lumière")
	void SetLightColor(FLinearColor NewColor);

protected:
	UPROPERTY()
	TObjectPtr<ULocalLightComponent> Light;

	UPROPERTY(Transient)
	TArray<TObjectPtr<UMaterialInstanceDynamic>> EmissiveMaterials;

private:
	void Apply(float K);
	bool IsGridOff() const;

	float State = 1.f;
	float Timer = 0.f;
	float Time = 0.f;
	float Phase = 0.f;
	int32 Burst = 0;
};
