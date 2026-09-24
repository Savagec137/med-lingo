// Objectif courant : même logique que blackwood/data/objectives.gd (fonction pure de l'état).
#pragma once

#include "CoreMinimal.h"

class ABWGameState;
class ABWPlayerState;

struct BLACKWOOD_API FBWObjectives
{
	/** Nombre d'objectifs de la version Godot (textes : UBWGameData::Objectives, même ordre). */
	static constexpr int32 Count = 26;

	/**
	 * Indice de l'objectif courant, calculé exactement comme Objectives.current() de Godot :
	 * les conditions sont testées dans le même ordre. LocalPlayer (peut être nul) sert aux
	 * tests « objet possédé » (porte-clés commun OU inventaire du joueur local).
	 */
	static int32 GetCurrentIndex(const ABWGameState* GameState, const ABWPlayerState* LocalPlayer);

	/** Texte de l'objectif courant (vide si les données ne sont pas importées). */
	static FText GetCurrentText(const ABWGameState* GameState, const ABWPlayerState* LocalPlayer);
};
