// Thomas Reed : reconstruction de blackwood/player/player.gd, player_camera.gd et flashlight.gd.
// Déplacement relatif à la caméra (marche, course, visée, esquive), caméra à l'épaule avec
// collision et interpolation (ou vue à la première personne), lampe torche à batterie,
// pas selon la surface et bruit entendu par les créatures. Compatible réseau : le serveur
// valide la course, la visée, l'esquive et la lampe ; le mouvement est répliqué par le
// CharacterMovementComponent.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "BWCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class USpotLightComponent;
class USoundAttenuation;
class ABWPlayerState;
class UBWInputConfig;

UCLASS()
class BLACKWOOD_API ABWCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ABWCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
	virtual float TakeDamage(float DamageAmount, struct FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;

	// --- Valeurs de la version Godot (m, s) ----------------------------------------------

	static constexpr float WalkSpeed = 2.3f;
	static constexpr float RunSpeed = 4.7f;
	static constexpr float AimSpeed = 1.3f;
	static constexpr float Accel = 9.f;
	static constexpr float Decel = 11.f;
	static constexpr float Gravity = 22.f;
	static constexpr float TurnSpeed = 10.f;
	static constexpr float DodgeSpeed = 7.f;
	static constexpr float DodgeTime = 0.4f;
	static constexpr float DodgeCooldown = 0.9f;
	static constexpr float DodgeInvulnerable = 0.32f;
	static constexpr float StrideWalk = 0.8f;
	static constexpr float StrideRun = 1.2f;
	static constexpr float HurtSlowTime = 0.45f;

	// Caméra (player_camera.gd)
	static constexpr float CameraHeight = 1.58f;
	static constexpr float Shoulder = 0.38f;
	static constexpr float ArmLength = 2.45f;
	static constexpr float AimArmLength = 1.1f;
	static constexpr float AimShoulder = 0.52f;
	static constexpr float EyeHeight = 1.62f;
	static constexpr float FollowSpeed = 9.f;
	static constexpr float MouseScale = 0.0022f;		// radians par pixel
	static constexpr float StickYawSpeed = 3.1f;		// radians par seconde
	static constexpr float StickPitchSpeed = 1.9f;
	static constexpr float PitchMin = -1.15f;			// radians (vers le bas)
	static constexpr float PitchMax = 0.85f;

	// Lampe torche (flashlight.gd)
	static constexpr float FlashlightEnergy = 5.f;
	static constexpr float FlashlightRange = 24.f;
	static constexpr float FlashlightAngle = 27.f;

	UFUNCTION(BlueprintPure, Category = "Joueur")
	ABWPlayerState* GetBWPlayerState() const;

	UFUNCTION(BlueprintPure, Category = "Joueur")
	bool IsAiming() const { return bAiming; }

	UFUNCTION(BlueprintPure, Category = "Joueur")
	bool IsRunning() const { return bRunning; }

	UFUNCTION(BlueprintPure, Category = "Caméra")
	bool IsFirstPerson() const { return bFirstPerson; }

	UFUNCTION(BlueprintCallable, Category = "Caméra")
	void SetFirstPerson(bool bEnable);

	/** Zone courante (appelé par ABWZoneVolume) : surface des pas et nom de la zone. */
	void EnterZone(FName ZoneId, FName Surface);

	UFUNCTION(BlueprintPure, Category = "Monde")
	FName GetCurrentZone() const { return CurrentZone; }

	/** Réglages joueur (repris de Settings : sensibilités, inversion, champ de vision). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Réglages")
	float MouseSensitivity = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Réglages")
	float StickSensitivity = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Réglages")
	bool bInvertY = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Réglages")
	float FieldOfView = 70.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Réglages")
	bool bHeadBob = true;

	/** Commande de test BWGod (serveur) : aucun dégât. */
	UPROPERTY(Transient, BlueprintReadWrite, Category = "Débogage")
	bool bGodMode = false;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Caméra")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Caméra")
	TObjectPtr<UCameraComponent> FollowCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Lampe")
	TObjectPtr<USpotLightComponent> FlashlightSpot;

	/** Visée et course décidées par le joueur, validées par le serveur (vitesse identique partout). */
	UPROPERTY(Replicated)
	bool bAiming = false;

	UPROPERTY(Replicated)
	bool bRunning = false;

	// --- Entrées ------------------------------------------------------------------------------
	void OnMove(const FInputActionValue& Value);
	void OnMoveReleased(const FInputActionValue& Value);
	void OnLookMouse(const FInputActionValue& Value);
	void OnLookStick(const FInputActionValue& Value);
	void OnRunPressed(const FInputActionValue& Value);
	void OnRunReleased(const FInputActionValue& Value);
	void OnRunToggle(const FInputActionValue& Value);
	void OnAimPressed(const FInputActionValue& Value);
	void OnAimReleased(const FInputActionValue& Value);
	void OnDodge(const FInputActionValue& Value);
	void OnFlashlight(const FInputActionValue& Value);
	void OnToggleView(const FInputActionValue& Value);

	// --- Serveur ------------------------------------------------------------------------------
	UFUNCTION(Server, Reliable)
	void ServerSetMoveModes(bool bNewRunning, bool bNewAiming);

	UFUNCTION(Server, Reliable)
	void ServerDodge(FVector_NetQuantizeNormal Direction);

	UFUNCTION(Server, Reliable)
	void ServerToggleFlashlight();

private:
	void ApplyLook(float YawDegrees, float PitchDegrees);
	void UpdateMovementModes(float DeltaSeconds);
	void UpdateCamera(float DeltaSeconds);
	void UpdateFlashlight(float DeltaSeconds);
	void UpdateFootsteps(float DeltaSeconds);
	void StartDodge(const FVector& Direction);
	void SendMoveModes();
	void ApplyPlayerMesh();
	bool CanAct() const;
	UBWInputConfig* GetInputConfig() const;
	USoundAttenuation* GetAttenuation(float MaxDistanceMeters);

	FVector2D MoveInput = FVector2D::ZeroVector;
	bool bRunHeld = false;
	bool bRunLatch = false;
	bool bAimHeld = false;
	bool bFirstPerson = false;
	float DodgeCooldownLeft = 0.f;
	float InvulnerableLeft = 0.f;
	float HurtSlowLeft = 0.f;
	float StrideAccum = 0.f;
	float BobPhase = 0.f;
	FVector FlashlightAim = FVector::ForwardVector;
	FName CurrentZone;
	FName CurrentSurface = TEXT("concrete");

	UPROPERTY(Transient)
	TMap<int32, TObjectPtr<USoundAttenuation>> Attenuations;
};
