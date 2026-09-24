#include "Player/BWCharacter.h"
#include "Player/BWPlayerState.h"
#include "Player/BWPlayerController.h"
#include "Player/BWInputConfig.h"
#include "Game/BWGameState.h"
#include "Core/BWProjectSettings.h"
#include "Core/BWGameInstance.h"
#include "Data/BWGameData.h"
#include "Blackwood.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/SpotLightComponent.h"
#include "EnhancedInputComponent.h"
#include "Engine/DamageEvents.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/World.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/RootMotionSource.h"
#include "GameFramework/SpringArmComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Net/UnrealNetwork.h"
#include "Perception/AISense_Hearing.h"
#include "Sound/SoundAttenuation.h"
#include "Sound/SoundBase.h"
#include "Animation/AnimInstance.h"

namespace
{
	constexpr float Cm = BWUnits::MetersToCm;

	/** Niveaux de batterie de flashlight.gd : 0, 10, 25, 50, 75, 100. */
	float BatteryPower(float Battery)
	{
		if (Battery <= 0.f) return 0.f;
		if (Battery <= 10.f) return 0.38f;
		if (Battery <= 25.f) return 0.6f;
		if (Battery <= 50.f) return 0.78f;
		if (Battery <= 75.f) return 0.9f;
		return 1.f;
	}

	float DbToGain(float Db)
	{
		return FMath::Pow(10.f, Db / 20.f);
	}
}

ABWCharacter::ABWCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	// Capsule : 0,35 m de rayon, 1,8 m de haut (Godot : Player CharacterBody3D)
	GetCapsuleComponent()->InitCapsuleSize(35.f, 90.f);

	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bOrientRotationToMovement = true;
	Move->RotationRate = FRotator(0.f, FMath::RadiansToDegrees(TurnSpeed), 0.f);
	Move->MaxWalkSpeed = WalkSpeed * Cm;
	Move->MaxAcceleration = Accel * FMath::Max(WalkSpeed, 2.f) * Cm;
	// Freinage linéaire comme move_toward(…, DECEL × delta × 2) dans Godot
	Move->BrakingDecelerationWalking = Decel * 2.f * Cm;
	Move->bUseSeparateBrakingFriction = true;
	Move->BrakingFriction = 0.f;
	Move->GroundFriction = 8.f;
	Move->GravityScale = Gravity / 9.81f;
	Move->JumpZVelocity = 0.f;
	Move->NavAgentProps.bCanJump = false;
	Move->NavAgentProps.bCanCrouch = false;

	// Caméra à l'épaule : pivot à 1,58 m, bras de 2,45 m, décalage d'épaule 0,38 m
	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->SetRelativeLocation(FVector(0.f, 0.f, CameraHeight * Cm - 90.f));
	CameraBoom->TargetArmLength = ArmLength * Cm;
	CameraBoom->SocketOffset = FVector(0.f, Shoulder * Cm, 0.f);
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->bDoCollisionTest = true;
	CameraBoom->ProbeSize = 12.f;
	CameraBoom->bEnableCameraLag = true;
	CameraBoom->CameraLagSpeed = FollowSpeed;

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;
	FollowCamera->SetFieldOfView(FieldOfView);

	// Lampe torche : portée 24 m, cône de 27°, ombres (flashlight.gd)
	FlashlightSpot = CreateDefaultSubobject<USpotLightComponent>(TEXT("FlashlightSpot"));
	FlashlightSpot->SetupAttachment(RootComponent);
	FlashlightSpot->SetRelativeLocation(FVector(25.f, 12.f, 45.f));
	FlashlightSpot->SetUsingAbsoluteRotation(true);
	FlashlightSpot->SetAttenuationRadius(FlashlightRange * Cm);
	FlashlightSpot->SetOuterConeAngle(FlashlightAngle);
	FlashlightSpot->SetInnerConeAngle(FlashlightAngle * 0.55f);
	FlashlightSpot->SetCastShadows(true);
	FlashlightSpot->SetVisibility(false);

	// Modèle provisoire (mannequin Unreal) : pieds au bas de la capsule, regard vers +X
	GetMesh()->SetRelativeLocation(FVector(0.f, 0.f, -90.f));
	GetMesh()->SetRelativeRotation(FRotator(0.f, -90.f, 0.f));
}

void ABWCharacter::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(ABWCharacter, bAiming);
	DOREPLIFETIME(ABWCharacter, bRunning);
}

void ABWCharacter::BeginPlay()
{
	Super::BeginPlay();
	ApplyPlayerMesh();
	const UBWProjectSettings* Settings = UBWProjectSettings::Get();
	FlashlightSpot->SetIntensityUnits(ELightUnits::Candelas);
	FlashlightSpot->SetIntensity(FlashlightEnergy * Settings->LightIntensityScale);
	FlashlightAim = GetActorForwardVector();
}

void ABWCharacter::ApplyPlayerMesh()
{
	USkeletalMeshComponent* MeshComp = GetMesh();
	if (!MeshComp || MeshComp->GetSkeletalMeshAsset())
	{
		return;
	}
	const UBWProjectSettings* Settings = UBWProjectSettings::Get();
	if (USkeletalMesh* PlayerMesh = Settings->PlayerMesh.LoadSynchronous())
	{
		MeshComp->SetSkeletalMeshAsset(PlayerMesh);
		if (UClass* AnimClass = Settings->PlayerAnimClass.LoadSynchronous())
		{
			MeshComp->SetAnimInstanceClass(AnimClass);
		}
	}
	else
	{
		UE_LOG(LogBlackwood, Warning, TEXT("Aucun modèle de joueur configuré (Paramètres du projet > Blackwood > Player Mesh)."));
	}
}

ABWPlayerState* ABWCharacter::GetBWPlayerState() const
{
	return GetPlayerState<ABWPlayerState>();
}

UBWInputConfig* ABWCharacter::GetInputConfig() const
{
	const ABWPlayerController* PC = Cast<ABWPlayerController>(GetController());
	return PC ? PC->GetInputConfig() : nullptr;
}

bool ABWCharacter::CanAct() const
{
	const ABWPlayerState* PS = GetBWPlayerState();
	return !PS || PS->IsActive();
}

// --- Entrées -----------------------------------------------------------------------------------

void ABWCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	UBWInputConfig* Config = GetInputConfig();
	if (!Input || !Config)
	{
		UE_LOG(LogBlackwood, Error, TEXT("Enhanced Input indisponible : vérifier Config/DefaultInput.ini."));
		return;
	}
	Input->BindAction(Config->Move, ETriggerEvent::Triggered, this, &ABWCharacter::OnMove);
	Input->BindAction(Config->Move, ETriggerEvent::Completed, this, &ABWCharacter::OnMoveReleased);
	Input->BindAction(Config->LookMouse, ETriggerEvent::Triggered, this, &ABWCharacter::OnLookMouse);
	Input->BindAction(Config->LookStick, ETriggerEvent::Triggered, this, &ABWCharacter::OnLookStick);
	Input->BindAction(Config->Run, ETriggerEvent::Started, this, &ABWCharacter::OnRunPressed);
	Input->BindAction(Config->Run, ETriggerEvent::Completed, this, &ABWCharacter::OnRunReleased);
	Input->BindAction(Config->RunToggle, ETriggerEvent::Started, this, &ABWCharacter::OnRunToggle);
	Input->BindAction(Config->Aim, ETriggerEvent::Started, this, &ABWCharacter::OnAimPressed);
	Input->BindAction(Config->Aim, ETriggerEvent::Completed, this, &ABWCharacter::OnAimReleased);
	Input->BindAction(Config->Dodge, ETriggerEvent::Started, this, &ABWCharacter::OnDodge);
	Input->BindAction(Config->Flashlight, ETriggerEvent::Started, this, &ABWCharacter::OnFlashlight);
	Input->BindAction(Config->ToggleView, ETriggerEvent::Started, this, &ABWCharacter::OnToggleView);
}

void ABWCharacter::OnMove(const FInputActionValue& Value)
{
	MoveInput = Value.Get<FVector2D>();
	if (!Controller || !CanAct())
	{
		return;
	}
	const FRotator YawRotation(0.f, Controller->GetControlRotation().Yaw, 0.f);
	const FRotationMatrix Basis(YawRotation);
	AddMovementInput(Basis.GetUnitAxis(EAxis::X), static_cast<float>(MoveInput.Y));
	AddMovementInput(Basis.GetUnitAxis(EAxis::Y), static_cast<float>(MoveInput.X));
}

void ABWCharacter::OnMoveReleased(const FInputActionValue& Value)
{
	MoveInput = FVector2D::ZeroVector;
}

void ABWCharacter::ApplyLook(float YawDegrees, float PitchDegrees)
{
	if (!Controller)
	{
		return;
	}
	FRotator Rotation = Controller->GetControlRotation();
	Rotation.Yaw = FRotator::NormalizeAxis(Rotation.Yaw + YawDegrees);
	const double Pitch = FRotator::NormalizeAxis(Rotation.Pitch + PitchDegrees);
	Rotation.Pitch = FMath::Clamp<double>(Pitch, FMath::RadiansToDegrees(PitchMin), FMath::RadiansToDegrees(PitchMax));
	Rotation.Roll = 0.f;
	Controller->SetControlRotation(Rotation);
}

void ABWCharacter::OnLookMouse(const FInputActionValue& Value)
{
	const FVector2D Delta = Value.Get<FVector2D>();
	const float Scale = FMath::RadiansToDegrees(MouseScale) * MouseSensitivity;
	ApplyLook(static_cast<float>(Delta.X) * Scale, static_cast<float>(Delta.Y) * Scale * (bInvertY ? -1.f : 1.f));
}

void ABWCharacter::OnLookStick(const FInputActionValue& Value)
{
	const FVector2D Stick = Value.Get<FVector2D>();
	const UWorld* World = GetWorld();
	const float Dt = World ? World->GetDeltaSeconds() : 0.f;
	ApplyLook(static_cast<float>(Stick.X) * FMath::RadiansToDegrees(StickYawSpeed) * StickSensitivity * Dt,
		static_cast<float>(Stick.Y) * FMath::RadiansToDegrees(StickPitchSpeed) * StickSensitivity * Dt * (bInvertY ? -1.f : 1.f));
}

void ABWCharacter::OnRunPressed(const FInputActionValue& Value)
{
	bRunHeld = true;
}

void ABWCharacter::OnRunReleased(const FInputActionValue& Value)
{
	bRunHeld = false;
}

void ABWCharacter::OnRunToggle(const FInputActionValue& Value)
{
	// Manette : L3 enclenche la course, qui dure jusqu'à l'arrêt
	bRunLatch = !bRunLatch;
}

void ABWCharacter::OnAimPressed(const FInputActionValue& Value)
{
	bAimHeld = true;
}

void ABWCharacter::OnAimReleased(const FInputActionValue& Value)
{
	bAimHeld = false;
}

void ABWCharacter::OnDodge(const FInputActionValue& Value)
{
	if (!CanAct() || DodgeCooldownLeft > 0.f || GetCharacterMovement()->IsFalling() || !Controller)
	{
		return;
	}
	const FRotator YawRotation(0.f, Controller->GetControlRotation().Yaw, 0.f);
	const FRotationMatrix Basis(YawRotation);
	FVector Direction = Basis.GetUnitAxis(EAxis::X) * MoveInput.Y + Basis.GetUnitAxis(EAxis::Y) * MoveInput.X;
	if (Direction.SizeSquared() < 0.01f)
	{
		// Sans direction : pas en arrière (Godot : Vector3(0, 0, 1) dans le repère du joueur)
		Direction = -GetActorForwardVector();
	}
	Direction = Direction.GetSafeNormal2D();
	StartDodge(Direction);
	if (!HasAuthority())
	{
		ServerDodge(Direction);
	}
}

void ABWCharacter::ServerDodge_Implementation(FVector_NetQuantizeNormal Direction)
{
	if (DodgeCooldownLeft <= 0.f && CanAct())
	{
		StartDodge(Direction);
	}
}

void ABWCharacter::StartDodge(const FVector& Direction)
{
	DodgeCooldownLeft = DodgeCooldown;
	InvulnerableLeft = DodgeInvulnerable;
	// Vitesse moyenne de la courbe Godot DODGE_SPEED × (0,35 + t × 0,9) sur DODGE_TIME
	TSharedPtr<FRootMotionSource_ConstantForce> Force = MakeShared<FRootMotionSource_ConstantForce>();
	Force->InstanceName = TEXT("BWDodge");
	Force->AccumulateMode = ERootMotionAccumulateMode::Override;
	Force->Priority = 5;
	Force->Force = Direction * DodgeSpeed * 0.8f * Cm;
	Force->Duration = DodgeTime;
	Force->FinishVelocityParams.Mode = ERootMotionFinishVelocityMode::ClampVelocity;
	Force->FinishVelocityParams.ClampVelocity = DodgeSpeed * 0.35f * Cm;
	GetCharacterMovement()->ApplyRootMotionSource(Force);
	if (const UBWGameData* Data = UBWGameData::Get(this))
	{
		UGameplayStatics::PlaySoundAtLocation(this, Data->FindSound(TEXT("dodge")), GetActorLocation() + FVector(0.f, 0.f, 10.f),
			DbToGain(-6.f), FMath::FRandRange(0.92f, 1.08f), 0.f, GetAttenuation(10.f));
	}
}

void ABWCharacter::OnFlashlight(const FInputActionValue& Value)
{
	if (CanAct())
	{
		ServerToggleFlashlight();
	}
}

void ABWCharacter::ServerToggleFlashlight_Implementation()
{
	ABWPlayerState* PS = GetBWPlayerState();
	const ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>();
	// Comme Godot : la lampe ne s'allume qu'une fois ramassée (drapeau « has_flashlight »)
	if (!PS || !GS || !GS->GetFlag(TEXT("has_flashlight")))
	{
		return;
	}
	PS->SetFlashlightOn(!PS->IsFlashlightOn());
	if (const UBWGameData* Data = UBWGameData::Get(this))
	{
		UGameplayStatics::PlaySoundAtLocation(this, Data->FindSound(TEXT("flashlight_click")), GetActorLocation(),
			DbToGain(-8.f), 1.f, 0.f, GetAttenuation(8.f));
	}
}

void ABWCharacter::OnToggleView(const FInputActionValue& Value)
{
	SetFirstPerson(!bFirstPerson);
}

void ABWCharacter::SetFirstPerson(bool bEnable)
{
	bFirstPerson = bEnable;
	GetMesh()->SetOwnerNoSee(bFirstPerson);
	CameraBoom->bDoCollisionTest = !bFirstPerson;
}

void ABWCharacter::ServerSetMoveModes_Implementation(bool bNewRunning, bool bNewAiming)
{
	bRunning = bNewRunning;
	bAiming = bNewAiming;
}

void ABWCharacter::SendMoveModes()
{
	// Godot : visée seulement avec une arme à feu en main ; la course cède devant la visée
	const ABWPlayerState* PS = GetBWPlayerState();
	const bool bArmed = PS && !PS->GetEquipped().IsNone();
	const bool bWantAim = bAimHeld && bArmed && CanAct();
	if (MoveInput.Size() < 0.25f || bWantAim)
	{
		bRunLatch = false;
	}
	const bool bWantRun = (bRunHeld || bRunLatch) && !bWantAim && CanAct();
	if (bWantRun != bRunning || bWantAim != bAiming)
	{
		bRunning = bWantRun;
		bAiming = bWantAim;
		if (!HasAuthority())
		{
			ServerSetMoveModes(bRunning, bAiming);
		}
	}
}

// --- Image par image ----------------------------------------------------------------------------

void ABWCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	DodgeCooldownLeft = FMath::Max(DodgeCooldownLeft - DeltaSeconds, 0.f);
	InvulnerableLeft = FMath::Max(InvulnerableLeft - DeltaSeconds, 0.f);
	HurtSlowLeft = FMath::Max(HurtSlowLeft - DeltaSeconds, 0.f);
	if (IsLocallyControlled())
	{
		SendMoveModes();
		UpdateCamera(DeltaSeconds);
	}
	UpdateMovementModes(DeltaSeconds);
	UpdateFlashlight(DeltaSeconds);
	UpdateFootsteps(DeltaSeconds);
}

void ABWCharacter::UpdateMovementModes(float DeltaSeconds)
{
	UCharacterMovementComponent* Move = GetCharacterMovement();
	float Speed = bAiming ? AimSpeed : (bRunning ? RunSpeed : WalkSpeed);
	if (HurtSlowLeft > 0.f)
	{
		Speed *= 0.6f;
	}
	const ABWPlayerState* PS = GetBWPlayerState();
	if (PS && PS->GetHealth() < 30.f)
	{
		Speed *= 0.82f;
	}
	Move->MaxWalkSpeed = Speed * Cm;
	Move->MaxAcceleration = Accel * FMath::Max(Speed, 2.f) * Cm;
	// Visée ou vue subjective : le personnage suit la caméra ; sinon il se tourne vers sa marche
	const bool bFaceCamera = bAiming || bFirstPerson;
	Move->bOrientRotationToMovement = !bFaceCamera;
	Move->bUseControllerDesiredRotation = bFaceCamera;
}

void ABWCharacter::UpdateCamera(float DeltaSeconds)
{
	const float K = 10.f;
	float WantLength = bAiming ? AimArmLength * Cm : ArmLength * Cm;
	float WantShoulder = bAiming ? AimShoulder * Cm : Shoulder * Cm;
	float WantHeight = CameraHeight * Cm - 90.f;
	if (bFirstPerson)
	{
		WantLength = 0.f;
		WantShoulder = 0.f;
		WantHeight = EyeHeight * Cm - 90.f;
		// Balancement de tête léger à la marche (réglage « head_bob »)
		const float Speed2D = static_cast<float>(GetVelocity().Size2D());
		if (bHeadBob && Speed2D > 40.f)
		{
			BobPhase += DeltaSeconds * Speed2D / 55.f;
			WantHeight += FMath::Sin(BobPhase * 2.f) * 1.6f;
		}
	}
	CameraBoom->TargetArmLength = FMath::FInterpTo(CameraBoom->TargetArmLength, WantLength, DeltaSeconds, K);
	FVector Offset = CameraBoom->SocketOffset;
	Offset.Y = FMath::FInterpTo(static_cast<float>(Offset.Y), WantShoulder, DeltaSeconds, K);
	CameraBoom->SocketOffset = Offset;
	FVector BoomLocation = CameraBoom->GetRelativeLocation();
	BoomLocation.Z = FMath::FInterpTo(static_cast<float>(BoomLocation.Z), WantHeight, DeltaSeconds, K);
	CameraBoom->SetRelativeLocation(BoomLocation);
	CameraBoom->bEnableCameraLag = !bFirstPerson;
	const float WantFov = FieldOfView - (bAiming ? (bFirstPerson ? 12.f : 16.f) : 0.f);
	FollowCamera->SetFieldOfView(FMath::FInterpTo(FollowCamera->FieldOfView, WantFov, DeltaSeconds, K));
}

void ABWCharacter::UpdateFlashlight(float DeltaSeconds)
{
	ABWPlayerState* PS = GetBWPlayerState();
	const bool bOn = PS && PS->IsFlashlightOn() && PS->GetFlashlightBattery() > 0.f;
	if (HasAuthority() && PS)
	{
		PS->DrainFlashlight(DeltaSeconds);
	}
	FlashlightSpot->SetVisibility(bOn);
	if (!bOn)
	{
		return;
	}
	// Faisceau orienté vers la visée (caméra), lissé comme update_light() de Godot
	FVector Target = GetActorForwardVector();
	if (Controller)
	{
		Target = Controller->GetControlRotation().Vector();
	}
	else
	{
		Target = GetBaseAimRotation().Vector();
	}
	const float Alpha = 1.f - FMath::Exp(-16.f * DeltaSeconds);
	FlashlightAim = FMath::Lerp(FlashlightAim, Target, Alpha).GetSafeNormal();
	FlashlightSpot->SetWorldRotation(FlashlightAim.Rotation());
	const float Power = BatteryPower(PS->GetFlashlightBattery());
	const UBWProjectSettings* Settings = UBWProjectSettings::Get();
	FlashlightSpot->SetIntensity(FlashlightEnergy * Settings->LightIntensityScale * Power);
	FlashlightSpot->SetAttenuationRadius(FlashlightRange * Cm * FMath::Sqrt(FMath::Max(Power, 0.1f)));
}

void ABWCharacter::UpdateFootsteps(float DeltaSeconds)
{
	const float Speed = static_cast<float>(GetVelocity().Size2D()) / Cm;
	if (!GetCharacterMovement()->IsMovingOnGround() || Speed < 0.4f)
	{
		StrideAccum = 0.f;
		return;
	}
	StrideAccum += Speed * DeltaSeconds;
	const float StrideLength = bRunning ? StrideRun : StrideWalk;
	if (StrideAccum < StrideLength)
	{
		return;
	}
	StrideAccum -= StrideLength;
	const FVector Feet = GetActorLocation() - FVector(0.f, 0.f, GetCapsuleComponent()->GetScaledCapsuleHalfHeight() - 10.f);
	// Son : step_<surface> (béton, carrelage, lino, moquette, bois, métal, extérieur)
	float VolumeDb = bRunning ? -4.f : -12.f;
	if (bAiming)
	{
		VolumeDb = -16.f;
	}
	if (const UBWGameData* Data = UBWGameData::Get(this))
	{
		const FName StepName(*FString::Printf(TEXT("step_%s"), *CurrentSurface.ToString()));
		UGameplayStatics::PlaySoundAtLocation(this, Data->FindSound(StepName), Feet, DbToGain(VolumeDb),
			FMath::FRandRange(0.9f, 1.1f), 0.f, GetAttenuation(18.f));
	}
	// Bruit entendu par les créatures : 11 m en courant, 3 m en marchant, 1,5 m en visant
	if (HasAuthority())
	{
		const float NoiseMeters = bRunning ? 11.f : (bAiming ? 1.5f : 3.f);
		UAISense_Hearing::ReportNoiseEvent(this, Feet, 1.f, this, NoiseMeters * Cm, TEXT("Footstep"));
	}
}

USoundAttenuation* ABWCharacter::GetAttenuation(float MaxDistanceMeters)
{
	const int32 Key = FMath::RoundToInt(MaxDistanceMeters);
	if (TObjectPtr<USoundAttenuation>* Found = Attenuations.Find(Key))
	{
		return *Found;
	}
	USoundAttenuation* Attenuation = NewObject<USoundAttenuation>(this);
	Attenuation->Attenuation.bAttenuate = true;
	Attenuation->Attenuation.bSpatialize = true;
	Attenuation->Attenuation.AttenuationShape = EAttenuationShape::Sphere;
	Attenuation->Attenuation.AttenuationShapeExtents = FVector(100.f, 0.f, 0.f);
	Attenuation->Attenuation.FalloffDistance = FMath::Max(MaxDistanceMeters * Cm - 100.f, 100.f);
	Attenuations.Add(Key, Attenuation);
	return Attenuation;
}

// --- Dégâts et zones -----------------------------------------------------------------------------

float ABWCharacter::TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser)
{
	if (!HasAuthority() || InvulnerableLeft > 0.f || bGodMode)
	{
		return 0.f;
	}
	const float Applied = Super::TakeDamage(DamageAmount, DamageEvent, EventInstigator, DamageCauser);
	ABWPlayerState* PS = GetBWPlayerState();
	if (!PS || Applied <= 0.f)
	{
		return 0.f;
	}
	const UBWGameData* Data = UBWGameData::Get(this);
	const UBWGameInstance* GI = Cast<UBWGameInstance>(GetGameInstance());
	const float Mult = Data ? Data->GetDifficulty(GI ? GI->Difficulty : 1).DamageTaken : 1.f;
	PS->ApplyDamage(Applied * Mult);
	HurtSlowLeft = HurtSlowTime;
	if (PS->GetHealth() <= 0.f)
	{
		PS->SetLifeState(EBWLifeState::Dead);
		GetCharacterMovement()->DisableMovement();
	}
	return Applied * Mult;
}

void ABWCharacter::EnterZone(FName ZoneId, FName Surface)
{
	CurrentZone = ZoneId;
	if (!Surface.IsNone())
	{
		CurrentSurface = Surface;
	}
	// La zone « de la partie » est celle de l'hôte (GameState.current_zone dans Godot)
	if (HasAuthority() && IsLocallyControlled())
	{
		if (ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>())
		{
			GS->SetCurrentZone(ZoneId);
		}
	}
}
