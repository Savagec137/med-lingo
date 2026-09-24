using UnrealBuildTool;
using System.Collections.Generic;

public class BlackwoodTarget : TargetRules
{
	public BlackwoodTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Blackwood");
	}
}
