// Actions et affectations Enhanced Input construites par le code, copie de
// blackwood/scripts/core/input_setup.gd (clavier / souris / manette).
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "BWInputConfig.generated.h"

class UInputAction;
class UInputMappingContext;

UCLASS()
class BLACKWOOD_API UBWInputConfig : public UObject
{
	GENERATED_BODY()

public:
	/** Crée les actions et le contexte d'affectation (appelé une fois par joueur local). */
	void Build();

	/** Déplacement 2D : X = droite, Y = avant. */
	UPROPERTY() TObjectPtr<UInputAction> Move;
	/** Regard à la souris (déplacement brut). */
	UPROPERTY() TObjectPtr<UInputAction> LookMouse;
	/** Regard au stick droit (-1..1, converti en vitesse de rotation). */
	UPROPERTY() TObjectPtr<UInputAction> LookStick;
	/** Course maintenue (Maj). */
	UPROPERTY() TObjectPtr<UInputAction> Run;
	/** Course enclenchée à la manette (L3), jusqu'à l'arrêt. */
	UPROPERTY() TObjectPtr<UInputAction> RunToggle;
	UPROPERTY() TObjectPtr<UInputAction> Interact;
	UPROPERTY() TObjectPtr<UInputAction> Inventory;
	UPROPERTY() TObjectPtr<UInputAction> Reload;
	UPROPERTY() TObjectPtr<UInputAction> Flashlight;
	UPROPERTY() TObjectPtr<UInputAction> Pause;
	UPROPERTY() TObjectPtr<UInputAction> Dodge;
	UPROPERTY() TObjectPtr<UInputAction> QuickHeal;
	UPROPERTY() TObjectPtr<UInputAction> ToggleView;
	UPROPERTY() TObjectPtr<UInputAction> Fire;
	UPROPERTY() TObjectPtr<UInputAction> Aim;
	UPROPERTY() TObjectPtr<UInputAction> WeaponNext;
	UPROPERTY() TObjectPtr<UInputAction> WeaponPrev;
	UPROPERTY() TObjectPtr<UInputAction> DebugConsole;
	UPROPERTY() TObjectPtr<UInputAction> DebugPerf;

	UPROPERTY() TObjectPtr<UInputMappingContext> Context;

private:
	UInputAction* MakeAction(const TCHAR* Name, bool bAxis2D);
};
