// Point d'apparition d'une créature (Facility.spawns de Godot) : type, variante, patrouille,
// états initiaux. Données de placement pour l'étape 12 (IA) : ce point ne fait rien seul.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BWEnemySpawnPoint.generated.h"

class UArrowComponent;
class UCapsuleComponent;

UCLASS()
class BLACKWOOD_API ABWEnemySpawnPoint : public AActor
{
	GENERATED_BODY()

public:
	ABWEnemySpawnPoint();

	/** Identifiant Godot (« b1_nurse », « f3_surgeon »…), utilisé par le scénario et la sauvegarde. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	FName SpawnId;

	/** hollow, veilleur, neonatal, colossus, surgeon, sarah, zero. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	FName EnemyType;

	/** Infectés : patient, nurse, guard, neuro, experimental. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	FName Variant;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	int32 Floor = 0;

	/** Endormi (se réveille au bruit) / sommeil profond (réveil scénarisé) / passif (scénarisé). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	bool bDormant = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	bool bDeepSleep = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	bool bPassive = false;

	/** N'apparaît que lorsque le drapeau est posé (ex. « self_destruct »). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	bool bEventSpawn = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	FName SpawnFlag;

	/** Points de patrouille (monde, cm). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature", meta = (MakeEditWidget = "true"))
	TArray<FVector> PatrolPoints;

	/** Chirurgien : poste de retour ; Néonatal : bouches d'aération. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	TArray<FVector> ExtraPoints;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Créature")
	FName PatrolAnchor;

protected:
	UPROPERTY(VisibleAnywhere, Category = "Créature")
	TObjectPtr<UCapsuleComponent> Capsule;

	UPROPERTY(VisibleAnywhere, Category = "Créature")
	TObjectPtr<UArrowComponent> Arrow;
};
