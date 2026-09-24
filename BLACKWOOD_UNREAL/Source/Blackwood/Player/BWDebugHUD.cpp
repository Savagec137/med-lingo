#include "Player/BWDebugHUD.h"
#include "Player/BWCharacter.h"
#include "Player/BWPlayerState.h"
#include "Game/BWGameState.h"
#include "Core/BWProjectSettings.h"
#include "Data/BWGameData.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"

void ABWDebugHUD::DrawHUD()
{
	Super::DrawHUD();
	if (!bShowDebug || !Canvas)
	{
		return;
	}
	const float Dt = GetWorld()->GetDeltaSeconds();
	if (Dt > 0.f)
	{
		SmoothedFps = FMath::Lerp(SmoothedFps, 1.f / Dt, 0.1f);
	}
	const APlayerController* PC = GetOwningPlayerController();
	const ABWCharacter* Thomas = PC ? Cast<ABWCharacter>(PC->GetPawn()) : nullptr;
	const ABWPlayerState* PS = PC ? PC->GetPlayerState<ABWPlayerState>() : nullptr;
	const ABWGameState* GS = GetWorld()->GetGameState<ABWGameState>();

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("BLACKWOOD (Unreal) - %.0f images/s"), SmoothedFps));
	if (!UBWGameData::Get(this))
	{
		Lines.Add(TEXT("DONNÉES NON IMPORTÉES : lancer Scripts/import_all.py dans l'éditeur"));
	}
	if (Thomas)
	{
		const FVector U = Thomas->GetActorLocation();
		const FVector G = UBWProjectSettings::Get()->UnrealToGodot(U - FVector(0.0, 0.0, 90.0));
		Lines.Add(FString::Printf(TEXT("Position Godot : %.2f  %.2f  %.2f  (commande BWTp)"), G.X, G.Y, G.Z));
		Lines.Add(FString::Printf(TEXT("Zone : %s   Vitesse : %.1f m/s%s%s%s"), *Thomas->GetCurrentZone().ToString(),
			Thomas->GetVelocity().Size2D() / 100.0, Thomas->IsRunning() ? TEXT("  COURSE") : TEXT(""),
			Thomas->IsAiming() ? TEXT("  VISÉE") : TEXT(""), Thomas->IsFirstPerson() ? TEXT("  1re PERSONNE") : TEXT("")));
		if (!Thomas->GetMesh() || !Thomas->GetMesh()->GetSkeletalMeshAsset())
		{
			Lines.Add(TEXT("Modèle du joueur absent : ajouter le contenu « Third Person » (voir README)"));
		}
	}
	if (PS)
	{
		Lines.Add(FString::Printf(TEXT("Santé : %.0f / 100   Lampe : %s %.1f %%   Joueur %d"), PS->GetHealth(),
			PS->IsFlashlightOn() ? TEXT("allumée") : TEXT("éteinte"), PS->GetFlashlightBattery(), PS->PlayerSlot));
		FString Inv;
		for (const FBWItemStack& S : PS->GetInventory())
		{
			Inv += S.IsEmpty() ? TEXT("[ ] ") : FString::Printf(TEXT("[%s x%d] "), *S.ItemId.ToString(), S.Count);
		}
		Lines.Add(TEXT("Inventaire : ") + Inv);
	}
	if (GS)
	{
		Lines.Add(FString::Printf(TEXT("Temps de jeu : %.0f s   Drapeaux : %d   Porte-clés : %d   Documents : %d"),
			GS->Playtime, GS->GetAllFlags().Num(), GS->GetKeyRing().Num(), GS->GetDocuments().Num()));
		Lines.Add(TEXT("Objectif : ") + GS->GetObjectiveText().ToString());
	}
	float Y = 14.f;
	UFont* Font = GEngine ? GEngine->GetSmallFont() : nullptr;
	for (const FString& Line : Lines)
	{
		DrawText(Line, FLinearColor(0.85f, 0.95f, 0.85f), 14.f, Y, Font, 1.f);
		Y += 16.f;
	}
}
