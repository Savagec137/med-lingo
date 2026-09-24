// Tests de validation par comparaison avec la version Godot (commande :
// UnrealEditor-Cmd.exe Blackwood.uproject -ExecCmds="Automation RunTests Blackwood" -unattended -nullrhi
// ou fenêtre Session Frontend > Automation). Les valeurs de référence viennent de
// SourceData/data.json, extrait du projet Godot par Tools/GodotExport.

#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

#include "Core/BWProjectSettings.h"
#include "Data/BWGameData.h"
#include "Data/BWDefinitions.h"
#include "Game/BWGameState.h"
#include "Game/BWObjectives.h"
#include "Player/BWPlayerState.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace BWTests
{
	TSharedPtr<FJsonObject> LoadGodotData()
	{
		FString Text;
		const FString Path = FPaths::Combine(FPaths::ProjectDir(), TEXT("SourceData"), TEXT("data.json"));
		if (!FFileHelper::LoadFileToString(Text, *Path))
		{
			return nullptr;
		}
		TSharedPtr<FJsonObject> Root;
		const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
		return FJsonSerializer::Deserialize(Reader, Root) ? Root : nullptr;
	}

	/** Monde de test minimal (sans GameInstance) pour faire vivre un GameState. */
	struct FTestWorld
	{
		UWorld* World = nullptr;

		FTestWorld()
		{
			World = UWorld::CreateWorld(EWorldType::Game, false);
			FWorldContext& Context = GEngine->CreateNewWorldContext(EWorldType::Game);
			Context.SetCurrentWorld(World);
		}

		~FTestWorld()
		{
			if (World)
			{
				GEngine->DestroyWorldContext(World);
				World->DestroyWorld(false);
			}
		}
	};
}

// --- Données : mêmes valeurs que Godot ----------------------------------------------------------

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBWDataParityTest, "Blackwood.Data.ParityWithGodot",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBWDataParityTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Godot = BWTests::LoadGodotData();
	if (!TestNotNull(TEXT("SourceData/data.json (lancer Tools/GodotExport/export_godot.py)"), Godot.Get()))
	{
		return false;
	}
	const UBWGameData* Data = UBWProjectSettings::Get()->GameData.LoadSynchronous();
	if (!TestNotNull(TEXT("DA_GameData (lancer Scripts/import_all.py)"), Data))
	{
		return false;
	}

	// Objets : la matraque est retirée par choix de conception (MIGRATION_MATRIX.md §20)
	const TSharedPtr<FJsonObject> Items = Godot->GetObjectField(TEXT("items"));
	for (const auto& Pair : Items->Values)
	{
		if (Pair.Key == TEXT("baton"))
		{
			TestNull(TEXT("baton retiré"), Data->FindItem(FName(*Pair.Key)));
			continue;
		}
		const UBWItemDefinition* Def = Data->FindItem(FName(*Pair.Key));
		if (!TestNotNull(*FString::Printf(TEXT("objet %s"), *Pair.Key), Def))
		{
			continue;
		}
		const TSharedPtr<FJsonObject> Item = Pair.Value->AsObject();
		TestEqual(*FString::Printf(TEXT("%s : pile max"), *Pair.Key), Def->MaxStack, static_cast<int32>(Item->GetNumberField(TEXT("max_stack"))));
		TestEqual(*FString::Printf(TEXT("%s : nom"), *Pair.Key), Def->DisplayName.ToString(), Item->GetStringField(TEXT("name")));
	}

	// Armes : dégâts, chargeur, cadence, portée
	const TSharedPtr<FJsonObject> Weapons = Godot->GetObjectField(TEXT("weapons"));
	for (const auto& Pair : Weapons->Values)
	{
		if (Pair.Key == TEXT("baton"))
		{
			TestNull(TEXT("matraque retirée"), Data->FindWeapon(FName(*Pair.Key)));
			continue;
		}
		const UBWWeaponDefinition* Def = Data->FindWeapon(FName(*Pair.Key));
		if (!TestNotNull(*FString::Printf(TEXT("arme %s"), *Pair.Key), Def))
		{
			continue;
		}
		const TSharedPtr<FJsonObject> W = Pair.Value->AsObject();
		TestEqual(*FString::Printf(TEXT("%s : dégâts"), *Pair.Key), Def->Damage, static_cast<float>(W->GetNumberField(TEXT("damage"))), 0.001f);
		TestEqual(*FString::Printf(TEXT("%s : chargeur"), *Pair.Key), Def->MagSize, static_cast<int32>(W->GetNumberField(TEXT("mag"))));
		TestEqual(*FString::Printf(TEXT("%s : cadence"), *Pair.Key), Def->Interval, static_cast<float>(W->GetNumberField(TEXT("interval"))), 0.001f);
		double Range = 0.0;
		if (W->TryGetNumberField(TEXT("range"), Range))
		{
			TestEqual(*FString::Printf(TEXT("%s : portée"), *Pair.Key), Def->Range, static_cast<float>(Range), 0.001f);
		}
	}

	// Ennemis : points de vie et vitesses de chaque profil
	const TSharedPtr<FJsonObject> Enemies = Godot->GetObjectField(TEXT("enemies"));
	for (const auto& Pair : Enemies->Values)
	{
		const UBWEnemyDefinition* Def = Data->FindEnemy(FName(*Pair.Key));
		if (!TestNotNull(*FString::Printf(TEXT("ennemi %s"), *Pair.Key), Def))
		{
			continue;
		}
		const TSharedPtr<FJsonObject> E = Pair.Value->AsObject();
		TestEqual(*FString::Printf(TEXT("%s : PV"), *Pair.Key), Def->MaxHealth, static_cast<float>(E->GetNumberField(TEXT("max_hp"))), 0.001f);
		TestEqual(*FString::Printf(TEXT("%s : course"), *Pair.Key), Def->ChaseSpeed, static_cast<float>(E->GetNumberField(TEXT("chase_speed"))), 0.001f);
	}

	// Documents et objectifs
	TestEqual(TEXT("nombre de documents"), Data->Documents.Num(), Godot->GetObjectField(TEXT("documents"))->Values.Num());
	const TArray<TSharedPtr<FJsonValue>>& Objectives = Godot->GetArrayField(TEXT("objectives"));
	TestEqual(TEXT("nombre d'objectifs"), Data->Objectives.Num(), Objectives.Num());
	TestEqual(TEXT("nombre d'objectifs attendu par BWObjectives"), Objectives.Num(), FBWObjectives::Count);
	for (int32 i = 0; i < FMath::Min(Data->Objectives.Num(), Objectives.Num()); ++i)
	{
		TestEqual(*FString::Printf(TEXT("objectif %d"), i), Data->Objectives[i].ToString(), Objectives[i]->AsString());
	}
	return true;
}

// --- Objectifs : même logique que data/objectives.gd --------------------------------------------

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBWObjectivesRulesTest, "Blackwood.Game.ObjectivesRules",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBWObjectivesRulesTest::RunTest(const FString& Parameters)
{
	BWTests::FTestWorld TestWorld;
	ABWGameState* GS = TestWorld.World->SpawnActor<ABWGameState>();
	if (!TestNotNull(TEXT("GameState de test"), GS))
	{
		return false;
	}
	// Progression pas à pas : chaque drapeau fait avancer l'objectif (indices = ordre des tests Godot)
	TestEqual(TEXT("départ"), FBWObjectives::GetCurrentIndex(GS, nullptr), 25);
	const TArray<TPair<const TCHAR*, int32>> Steps = {
		{TEXT("main_door_seen"), 24}, {TEXT("entered_hospital"), 23}, {TEXT("nurse_seen"), 22},
		{TEXT("reached_ground"), 21}, {TEXT("b2_arrived"), 19}, {TEXT("power_restored"), 18},
		{TEXT("reached_f3"), 17}, {TEXT("stair_b_open"), 13}, {TEXT("reached_floor_6"), 12},
		{TEXT("reached_f8"), 10}, {TEXT("sarah_video_seen"), 9}, {TEXT("reached_f11"), 7},
		{TEXT("sarah_boss_started"), 6}, {TEXT("sarah_dead"), 5}, {TEXT("reached_f12"), 4},
		{TEXT("self_destruct"), 3}, {TEXT("esc_8"), 2}, {TEXT("esc_b1"), 1}, {TEXT("game_complete"), 0},
	};
	for (const TPair<const TCHAR*, int32>& Step : Steps)
	{
		GS->SetFlag(FName(Step.Key), true);
		TestEqual(*FString::Printf(TEXT("après %s"), Step.Key), FBWObjectives::GetCurrentIndex(GS, nullptr), Step.Value);
	}
	// Objets du porte-clés et documents
	ABWGameState* GS2 = TestWorld.World->SpawnActor<ABWGameState>();
	GS2->AddKey(TEXT("key_technical"));
	TestEqual(TEXT("clé du local technique"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 20);
	GS2->AddKey(TEXT("key_locker"));
	TestEqual(TEXT("clé du casier"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 16);
	GS2->AddDocument(TEXT("doc_sarah_note"));
	TestEqual(TEXT("note de Sarah"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 15);
	GS2->SetFlag(TEXT("surgeon_started"));
	TestEqual(TEXT("Chirurgien"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 14);
	GS2->SetFlag(TEXT("surgeon_dead"));
	TestEqual(TEXT("Chirurgien vaincu"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 15);
	GS2->AddKey(TEXT("card_research"));
	TestEqual(TEXT("carte recherche"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 11);
	GS2->AddKey(TEXT("key_private"));
	TestEqual(TEXT("clé de direction"), FBWObjectives::GetCurrentIndex(GS2, nullptr), 8);
	return true;
}

// --- Inventaire : mêmes règles d'empilement que PlayerData ----------------------------------------

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBWInventoryRulesTest, "Blackwood.Player.InventoryRules",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBWInventoryRulesTest::RunTest(const FString& Parameters)
{
	BWTests::FTestWorld TestWorld;
	ABWPlayerState* PS = TestWorld.World->SpawnActor<ABWPlayerState>();
	if (!TestNotNull(TEXT("PlayerState de test"), PS))
	{
		return false;
	}
	// Sans registre de données (monde de test), MaxStack vaut 1 et tout objet inconnu est une clé :
	// on vérifie ici l'algorithme d'emplacements, les tailles de pile étant testées par ParityWithGodot.
	TestEqual(TEXT("6 emplacements libres"), PS->FreeSlots(), ABWPlayerState::InventorySlots);
	TestEqual(TEXT("santé initiale"), PS->GetHealth(), ABWPlayerState::MaxHealth);
	PS->ApplyDamage(30.f);
	TestEqual(TEXT("dégâts"), PS->GetHealth(), 70.f);
	PS->Heal(40.f);
	TestEqual(TEXT("soin plafonné"), PS->GetHealth(), 100.f);
	return true;
}

#endif
