// Règles de la partie (serveur uniquement) : classes du joueur, deux joueurs maximum (coop),
// places de départ, chargement d'une sauvegarde demandée depuis le menu.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BWGameMode.generated.h"

UCLASS()
class BLACKWOOD_API ABWGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ABWGameMode();

	static constexpr int32 MaxPlayers = 2;

	virtual void PreLogin(const FString& Options, const FString& Address, const FUniqueNetIdRepl& UniqueId, FString& ErrorMessage) override;
	virtual void PostLogin(APlayerController* NewPlayer) override;
	virtual void StartPlay() override;
	virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

	/** Sauvegarde automatique (appelée par le scénario aux étapes clés). */
	UFUNCTION(BlueprintCallable, Category = "Sauvegarde")
	void AutoSave(const FString& Reason);
};
