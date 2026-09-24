// Surimpression de débogage (F3) : l'équivalent de ui/perf_overlay.gd, plus l'état utile pour
// comparer avec Godot (coordonnées Godot, zone, santé, lampe, objectif). L'interface définitive
// (HUD, menus) sera faite en UMG (étape 13).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "BWDebugHUD.generated.h"

UCLASS()
class BLACKWOOD_API ABWDebugHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Débogage")
	bool bShowDebug = true;

private:
	float SmoothedFps = 60.f;
};
