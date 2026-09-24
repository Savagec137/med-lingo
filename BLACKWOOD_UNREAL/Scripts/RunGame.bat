@echo off
setlocal
rem LANCE : le jeu seul (sans l'éditeur), fenêtré 1280×720.
call "%~dp0_FindEngine.bat" %1 || exit /b 1
"%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0..\Blackwood.uproject" /Game/Blackwood/Maps/L_BlackwoodHospital -game -windowed -ResX=1280 -ResY=720 -log
