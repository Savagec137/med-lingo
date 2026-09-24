#include "Player/BWInputConfig.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"
#include "InputTriggers.h"
#include "InputCoreTypes.h"

namespace
{
	/** Zone morte radiale (Godot : 0,2 au stick gauche, 0,12 au stick droit). */
	void AddDeadZone(UObject* Outer, FEnhancedActionKeyMapping& Mapping, float Lower)
	{
		UInputModifierDeadZone* DeadZone = NewObject<UInputModifierDeadZone>(Outer);
		DeadZone->LowerThreshold = Lower;
		DeadZone->Type = EDeadZoneType::Radial;
		Mapping.Modifiers.Add(DeadZone);
	}

	/** Touche qui pousse l'axe Y (avant / arrière) au lieu de X. */
	void AddSwizzle(UObject* Outer, FEnhancedActionKeyMapping& Mapping)
	{
		UInputModifierSwizzleAxis* Swizzle = NewObject<UInputModifierSwizzleAxis>(Outer);
		Swizzle->Order = EInputAxisSwizzle::YXZ;
		Mapping.Modifiers.Add(Swizzle);
	}

	void AddNegate(UObject* Outer, FEnhancedActionKeyMapping& Mapping)
	{
		Mapping.Modifiers.Add(NewObject<UInputModifierNegate>(Outer));
	}

	/** Gâchettes : déclenchement à 0,3 comme dans Godot. */
	void AddTriggerThreshold(UObject* Outer, FEnhancedActionKeyMapping& Mapping, float Threshold)
	{
		UInputTriggerDown* Down = NewObject<UInputTriggerDown>(Outer);
		Down->ActuationThreshold = Threshold;
		Mapping.Triggers.Add(Down);
	}
}

UInputAction* UBWInputConfig::MakeAction(const TCHAR* Name, bool bAxis2D)
{
	UInputAction* Action = NewObject<UInputAction>(this, FName(Name));
	Action->ValueType = bAxis2D ? EInputActionValueType::Axis2D : EInputActionValueType::Boolean;
	return Action;
}

void UBWInputConfig::Build()
{
	Move = MakeAction(TEXT("IA_Move"), true);
	LookMouse = MakeAction(TEXT("IA_LookMouse"), true);
	LookStick = MakeAction(TEXT("IA_LookStick"), true);
	Run = MakeAction(TEXT("IA_Run"), false);
	RunToggle = MakeAction(TEXT("IA_RunToggle"), false);
	Interact = MakeAction(TEXT("IA_Interact"), false);
	Inventory = MakeAction(TEXT("IA_Inventory"), false);
	Reload = MakeAction(TEXT("IA_Reload"), false);
	Flashlight = MakeAction(TEXT("IA_Flashlight"), false);
	Pause = MakeAction(TEXT("IA_Pause"), false);
	Dodge = MakeAction(TEXT("IA_Dodge"), false);
	QuickHeal = MakeAction(TEXT("IA_QuickHeal"), false);
	ToggleView = MakeAction(TEXT("IA_ToggleView"), false);
	Fire = MakeAction(TEXT("IA_Fire"), false);
	Aim = MakeAction(TEXT("IA_Aim"), false);
	WeaponNext = MakeAction(TEXT("IA_WeaponNext"), false);
	WeaponPrev = MakeAction(TEXT("IA_WeaponPrev"), false);
	DebugConsole = MakeAction(TEXT("IA_DebugConsole"), false);
	DebugPerf = MakeAction(TEXT("IA_DebugPerf"), false);

	Context = NewObject<UInputMappingContext>(this, TEXT("IMC_Blackwood"));
	UInputMappingContext* C = Context;

	// --- Déplacement : WASD et ZQSD (clavier AZERTY), flèches, stick gauche --------------
	// Unreal nomme les touches d'après la disposition du clavier : on affecte les deux
	// dispositions (Z et W avancent, Q et A vont à gauche), sans conflit avec d'autres actions.
	for (const FKey& Key : {EKeys::W, EKeys::Z, EKeys::Up})
	{
		AddSwizzle(C, C->MapKey(Move, Key));
	}
	for (const FKey& Key : {EKeys::S, EKeys::Down})
	{
		FEnhancedActionKeyMapping& M = C->MapKey(Move, Key);
		AddSwizzle(C, M);
		AddNegate(C, M);
	}
	for (const FKey& Key : {EKeys::A, EKeys::Q, EKeys::Left})
	{
		AddNegate(C, C->MapKey(Move, Key));
	}
	for (const FKey& Key : {EKeys::D, EKeys::Right})
	{
		C->MapKey(Move, Key);
	}
	AddDeadZone(C, C->MapKey(Move, EKeys::Gamepad_Left2D), 0.2f);

	// --- Regard ----------------------------------------------------------------------------
	C->MapKey(LookMouse, EKeys::Mouse2D);
	AddDeadZone(C, C->MapKey(LookStick, EKeys::Gamepad_Right2D), 0.12f);

	// --- Actions (mêmes touches que la version Godot) -------------------------------------------
	C->MapKey(Run, EKeys::LeftShift);
	C->MapKey(RunToggle, EKeys::Gamepad_LeftThumbstick);
	C->MapKey(Interact, EKeys::E);
	C->MapKey(Interact, EKeys::Gamepad_FaceButton_Bottom);
	C->MapKey(Inventory, EKeys::Tab);
	C->MapKey(Inventory, EKeys::I);
	C->MapKey(Inventory, EKeys::Gamepad_Special_Left);
	C->MapKey(Inventory, EKeys::Gamepad_DPad_Down);
	C->MapKey(Reload, EKeys::R);
	C->MapKey(Reload, EKeys::Gamepad_FaceButton_Left);
	C->MapKey(Flashlight, EKeys::F);
	C->MapKey(Flashlight, EKeys::Gamepad_DPad_Up);
	C->MapKey(Pause, EKeys::Escape);
	C->MapKey(Pause, EKeys::Gamepad_Special_Right);
	C->MapKey(Dodge, EKeys::SpaceBar);
	C->MapKey(Dodge, EKeys::Gamepad_FaceButton_Right);
	C->MapKey(QuickHeal, EKeys::H);
	C->MapKey(QuickHeal, EKeys::Gamepad_FaceButton_Top);
	C->MapKey(ToggleView, EKeys::V);
	C->MapKey(ToggleView, EKeys::Gamepad_RightThumbstick);
	C->MapKey(Fire, EKeys::LeftMouseButton);
	AddTriggerThreshold(C, C->MapKey(Fire, EKeys::Gamepad_RightTriggerAxis), 0.3f);
	C->MapKey(Aim, EKeys::RightMouseButton);
	AddTriggerThreshold(C, C->MapKey(Aim, EKeys::Gamepad_LeftTriggerAxis), 0.3f);
	C->MapKey(WeaponNext, EKeys::MouseScrollDown);
	C->MapKey(WeaponNext, EKeys::Gamepad_RightShoulder);
	C->MapKey(WeaponNext, EKeys::Gamepad_DPad_Right);
	C->MapKey(WeaponPrev, EKeys::MouseScrollUp);
	C->MapKey(WeaponPrev, EKeys::Gamepad_LeftShoulder);
	C->MapKey(WeaponPrev, EKeys::Gamepad_DPad_Left);
	C->MapKey(DebugConsole, EKeys::F1);
	C->MapKey(DebugPerf, EKeys::F3);
}
