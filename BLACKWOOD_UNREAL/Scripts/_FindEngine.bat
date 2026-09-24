@echo off
rem Trouve le moteur Unreal : 1er argument, variable UE_ROOT, puis la dernière version
rem installée par l'Epic Games Launcher (C:\Program Files\Epic Games\UE_5.x).
set "UE=%~1"
if "%UE%"=="" set "UE=%UE_ROOT%"
if "%UE%"=="" for /d %%D in ("C:\Program Files\Epic Games\UE_5.*") do set "UE=%%D"
if not exist "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" (
  echo Moteur Unreal introuvable. Indiquer son dossier, par exemple :
  echo   %~n0 "C:\Program Files\Epic Games\UE_5.8"
  exit /b 1
)
exit /b 0
