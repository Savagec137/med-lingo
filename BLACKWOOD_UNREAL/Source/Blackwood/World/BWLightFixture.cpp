#include "World/BWLightFixture.h"
#include "Game/BWGameState.h"
#include "Core/BWProjectSettings.h"
#include "Components/PointLightComponent.h"
#include "Components/SpotLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace
{
	const FName EmissiveParam(TEXT("EmissiveStrength"));
}

ABWLightFixture::ABWLightFixture()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickInterval = 0.f;
}

void ABWLightFixture::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	ULocalLightComponent* NewLight = nullptr;
	if (bSpot)
	{
		USpotLightComponent* Spot = NewObject<USpotLightComponent>(this,
			MakeUniqueObjectName(this, USpotLightComponent::StaticClass(), TEXT("Spot")));
		Spot->SetOuterConeAngle(SpotAngle);
		Spot->SetInnerConeAngle(SpotAngle * 0.6f);
		NewLight = Spot;
	}
	else
	{
		NewLight = NewObject<UPointLightComponent>(this,
			MakeUniqueObjectName(this, UPointLightComponent::StaticClass(), TEXT("Point")));
	}
	NewLight->CreationMethod = EComponentCreationMethod::UserConstructionScript;
	NewLight->SetupAttachment(Root);
	NewLight->SetRelativeTransform(LightLocal);
	NewLight->SetMobility(EComponentMobility::Movable);
	NewLight->SetIntensityUnits(ELightUnits::Candelas);
	NewLight->SetIntensity(Energy * UBWProjectSettings::Get()->LightIntensityScale);
	NewLight->SetLightColor(Color);
	NewLight->SetAttenuationRadius(Range);
	NewLight->SetCastShadows(bCastShadows);
	NewLight->SetVolumetricScatteringIntensity(FMath::Max(FogScattering, 0.f));
	// Chute physique (inverse du carré, candelas), adaptée à Lumen ; la portée Godot limite le rayon.
	NewLight->RegisterComponent();
	Light = NewLight;
}

void ABWLightFixture::BeginPlay()
{
	Super::BeginPlay();
	Phase = FMath::FRandRange(0.f, 2.f * PI);
	// Matériaux émissifs pilotés par l'état de la lumière
	EmissiveMaterials.Reset();
	for (UStaticMeshComponent* MeshComp : PartMeshes)
	{
		if (!MeshComp)
		{
			continue;
		}
		for (int32 i = 0; i < MeshComp->GetNumMaterials(); ++i)
		{
			UMaterialInterface* Mat = MeshComp->GetMaterial(i);
			float Current = 0.f;
			if (Mat && Mat->GetScalarParameterValue(FHashedMaterialParameterInfo(EmissiveParam), Current) && Current > 0.f)
			{
				EmissiveMaterials.Add(MeshComp->CreateAndSetMaterialInstanceDynamic(i));
			}
		}
	}
	Apply(Mode != EBWLightMode::Off && !IsGridOff() && bPowered ? 1.f : 0.f);
}

bool ABWLightFixture::IsGridOff() const
{
	if (!bGridPowered)
	{
		return false;
	}
	const ABWGameState* GS = GetWorld() ? GetWorld()->GetGameState<ABWGameState>() : nullptr;
	return !GS || !GS->GetFlag(TEXT("power_restored"));
}

void ABWLightFixture::SetMode(EBWLightMode NewMode)
{
	Mode = NewMode;
	if (Mode == EBWLightMode::Off)
	{
		Apply(0.f);
	}
}

void ABWLightFixture::SetPowered(bool bOn)
{
	bPowered = bOn;
	if (!bOn)
	{
		Apply(0.f);
	}
}

void ABWLightFixture::SetLightColor(FLinearColor NewColor)
{
	Color = NewColor;
	if (Light)
	{
		Light->SetLightColor(NewColor);
	}
}

void ABWLightFixture::Apply(float K)
{
	State = K;
	if (Light)
	{
		Light->SetIntensity(Energy * UBWProjectSettings::Get()->LightIntensityScale * K);
		Light->SetVisibility(K > 0.01f);
	}
	for (UMaterialInstanceDynamic* MID : EmissiveMaterials)
	{
		if (MID)
		{
			MID->SetScalarParameterValue(EmissiveParam, EmissiveEnergy * K);
		}
	}
}

void ABWLightFixture::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	// Même automate que LightFixture._process() de Godot
	if (!bPowered || Mode == EBWLightMode::Off || IsGridOff())
	{
		if (State != 0.f)
		{
			Apply(0.f);
		}
		return;
	}
	Time += DeltaSeconds;
	if (RotateSpeed != 0.f && Light)
	{
		Light->AddLocalRotation(FRotator(0.f, FMath::RadiansToDegrees(RotateSpeed * DeltaSeconds), 0.f));
	}
	switch (Mode)
	{
	case EBWLightMode::Steady:
		if (State != 1.f)
		{
			Apply(1.f);
		}
		break;
	case EBWLightMode::Pulse:
		Apply(0.35f + 0.65f * (0.5f + 0.5f * FMath::Sin(Time * 2.2f + Phase)));
		break;
	case EBWLightMode::Flicker:
		Timer -= DeltaSeconds;
		if (Timer <= 0.f)
		{
			if (Burst > 0)
			{
				--Burst;
				Apply(State > 0.5f ? FMath::FRandRange(0.f, 0.35f) : 1.f);
				Timer = FMath::FRandRange(0.03f, 0.09f);
			}
			else if (FMath::FRand() < 0.18f)
			{
				Burst = FMath::RandRange(2, 7);
				Timer = 0.02f;
			}
			else
			{
				Apply(FMath::FRandRange(0.88f, 1.f));
				Timer = FMath::FRandRange(0.15f, 1.2f);
			}
		}
		break;
	case EBWLightMode::Broken:
		Timer -= DeltaSeconds;
		if (Timer <= 0.f)
		{
			if (Burst > 0)
			{
				--Burst;
				Apply(State < 0.3f ? FMath::FRandRange(0.4f, 1.f) : 0.f);
				Timer = FMath::FRandRange(0.03f, 0.12f);
			}
			else if (FMath::FRand() < 0.35f)
			{
				Burst = FMath::RandRange(3, 9);
				Timer = 0.02f;
			}
			else
			{
				Apply(0.f);
				Timer = FMath::FRandRange(0.8f, 4.f);
			}
		}
		break;
	default:
		break;
	}
}
