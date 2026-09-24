using UnrealBuildTool;

public class Blackwood : ModuleRules
{
	public Blackwood(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput",
			"AIModule", "NavigationSystem", "GameplayTasks",
			"UMG", "Slate", "SlateCore", "DeveloperSettings",
			"Json", "JsonUtilities", "NetCore", "PhysicsCore"
		});
	}
}
