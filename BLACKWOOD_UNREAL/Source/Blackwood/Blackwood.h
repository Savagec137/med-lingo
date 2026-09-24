// Blackwood Hospital - module de jeu principal.
#pragma once

#include "CoreMinimal.h"

DECLARE_LOG_CATEGORY_EXTERN(LogBlackwood, Log, All);

/** Conversion d'unités : Godot travaille en mètres, Unreal en centimètres. */
namespace BWUnits
{
	constexpr float MetersToCm = 100.f;
}
