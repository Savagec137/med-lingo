#include "Data/BWGameData.h"
#include "Data/BWDefinitions.h"
#include "Core/BWGameInstance.h"
#include "Engine/World.h"
#include "Engine/Engine.h"
#include "Sound/SoundBase.h"

UBWItemDefinition* UBWGameData::FindItem(FName ItemId) const
{
	for (UBWItemDefinition* Def : Items)
	{
		if (Def && Def->ItemId == ItemId)
		{
			return Def;
		}
	}
	return nullptr;
}

UBWWeaponDefinition* UBWGameData::FindWeapon(FName WeaponId) const
{
	for (UBWWeaponDefinition* Def : Weapons)
	{
		if (Def && Def->WeaponId == WeaponId)
		{
			return Def;
		}
	}
	return nullptr;
}

UBWEnemyDefinition* UBWGameData::FindEnemy(FName ProfileId) const
{
	for (UBWEnemyDefinition* Def : Enemies)
	{
		if (Def && Def->ProfileId == ProfileId)
		{
			return Def;
		}
	}
	return nullptr;
}

UBWDocumentDefinition* UBWGameData::FindDocument(FName DocId) const
{
	for (UBWDocumentDefinition* Def : Documents)
	{
		if (Def && Def->DocId == DocId)
		{
			return Def;
		}
	}
	return nullptr;
}

void UBWGameData::BuildSoundIndex() const
{
	SoundIndex.Reset();
	for (USoundBase* Sound : Sounds)
	{
		if (!Sound)
		{
			continue;
		}
		const FString Name = Sound->GetName();
		SoundIndex.FindOrAdd(FName(*Name)).Add(Sound);
		// Variante « nom_3 » : aussi rangée sous « nom » (comme AudioManager dans Godot)
		int32 Underscore = INDEX_NONE;
		if (Name.FindLastChar(TEXT('_'), Underscore) && Underscore > 0)
		{
			const FString Suffix = Name.Mid(Underscore + 1);
			if (Suffix.IsNumeric())
			{
				SoundIndex.FindOrAdd(FName(*Name.Left(Underscore))).Add(Sound);
			}
		}
	}
}

USoundBase* UBWGameData::FindSound(FName SoundName) const
{
	if (SoundIndex.Num() == 0)
	{
		BuildSoundIndex();
	}
	const TArray<TObjectPtr<USoundBase>>* Found = SoundIndex.Find(SoundName);
	if (!Found || Found->Num() == 0)
	{
		return nullptr;
	}
	// Nom exact prioritaire ; sinon une variante au hasard
	for (USoundBase* Sound : *Found)
	{
		if (Sound && Sound->GetFName() == SoundName)
		{
			return Sound;
		}
	}
	return (*Found)[FMath::RandRange(0, Found->Num() - 1)];
}

FBWDifficulty UBWGameData::GetDifficulty(int32 Level) const
{
	if (Difficulty.Num() == 0)
	{
		return FBWDifficulty();
	}
	return Difficulty[FMath::Clamp(Level, 0, Difficulty.Num() - 1)];
}

UBWGameData* UBWGameData::Get(const UObject* WorldContextObject)
{
	const UWorld* World = GEngine ? GEngine->GetWorldFromContextObject(WorldContextObject, EGetWorldErrorMode::ReturnNull) : nullptr;
	const UBWGameInstance* GI = World ? Cast<UBWGameInstance>(World->GetGameInstance()) : nullptr;
	return GI ? GI->GetGameData() : nullptr;
}
