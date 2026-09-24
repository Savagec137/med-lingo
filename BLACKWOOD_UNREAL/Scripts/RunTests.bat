@echo off
setlocal
rem TESTE : tests automatises Blackwood.* (comparaison avec la version Godot), sans fenetre.
rem Resultats : Saved\Automation\index.json et le journal Saved\Logs\Blackwood.log
call "%~dp0_FindEngine.bat" %1 || exit /b 1
"%UE%\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" "%~dp0..\Blackwood.uproject" -ExecCmds="Automation RunTests Blackwood" -TestExit="Automation Test Queue Empty" -ReportExportPath="%~dp0..\Saved\Automation" -unattended -nullrhi -nosound -log
exit /b %ERRORLEVEL%
