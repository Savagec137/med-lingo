#include "Core/BWGameInstance.h"
#include "Core/BWProjectSettings.h"
#include "Data/BWGameData.h"
#include "Blackwood.h"

void UBWGameInstance::Init()
{
	Super::Init();
	const UBWProjectSettings* Settings = UBWProjectSettings::Get();
	GameData = Settings->GameData.LoadSynchronous();
	if (!GameData)
	{
		UE_LOG(LogBlackwood, Warning,
			TEXT("Registre de données introuvable (%s) : lancer Scripts/import_all.py dans l'éditeur."),
			*Settings->GameData.ToString());
	}
}
