@echo off
rem Trouve le moteur Unreal : 1er argument, variable UE_ROOT, installations enregistrees par
rem l'Epic Games Launcher (registre Windows), puis C:\Program Files\Epic Games\UE_5.x
set "UE=%~1"
if "%UE%"=="" set "UE=%UE_ROOT%"
if "%UE%"=="" for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\EpicGames\Unreal Engine" /s /v InstalledDirectory 2^>nul ^| findstr /c:"InstalledDirectory"') do if exist "%%B\Engine\Binaries\Win64\UnrealEditor.exe" set "UE=%%B"
if "%UE%"=="" for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\WOW6432Node\EpicGames\Unreal Engine" /s /v InstalledDirectory 2^>nul ^| findstr /c:"InstalledDirectory"') do if exist "%%B\Engine\Binaries\Win64\UnrealEditor.exe" set "UE=%%B"
if "%UE%"=="" for /d %%D in ("C:\Program Files\Epic Games\UE_5.*") do set "UE=%%D"
if not exist "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" (
  echo Moteur Unreal introuvable. Indiquer son dossier, par exemple :
  echo   Scripts\SetupAll.bat "D:\Epic Games\UE_5.8"
  exit /b 1
)
exit /b 0
