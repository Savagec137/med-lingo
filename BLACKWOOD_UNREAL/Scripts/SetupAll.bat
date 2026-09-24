@echo off
chcp 65001 >nul
setlocal EnableExtensions
title Blackwood - installation dans Unreal
rem ============================================================================================
rem  Tout en un : verification, fichiers extraits, mannequin, compilation, import, tests.
rem  Usage : double-clic (ou Scripts\SetupAll.bat "D:\Epic Games\UE_5.8")
rem  Journaux : Saved\Blackwood\ (build.log, import_report.txt, tests.log) et Saved\Automation\
rem  Ce fichier reste en ASCII (sans accents) : cmd lit mal les .bat qui contiennent de l'UTF-8.
rem ============================================================================================
cd /d "%~dp0.."
if not exist "Saved\Blackwood" mkdir "Saved\Blackwood"

echo.
echo === [1/6] Verification des outils ===
call "%~dp0_FindEngine.bat" %1
if errorlevel 1 goto :fail
echo Unreal Engine : %UE%
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VSPATH="
if exist "%VSWHERE%" for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSPATH=%%I"
if not defined VSPATH (
  echo.
  echo Visual Studio 2022 avec les outils C++ est introuvable. Il est indispensable pour compiler
  echo le code du jeu. Installer gratuitement "Visual Studio Community 2022" :
  echo   https://visualstudio.microsoft.com/fr/downloads/
  echo en cochant la charge de travail "Developpement de jeux en C++", puis relancer ce script.
  goto :fail
)
echo Visual Studio : %VSPATH%

rem Version du moteur (Engine\Build\Build.version) inscrite dans Blackwood.uproject si elle est vide
set "UEVER="
if exist "%UE%\Engine\Build\Build.version" for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "$v = Get-Content -Raw '%UE%\Engine\Build\Build.version' | ConvertFrom-Json; [string]$v.MajorVersion + '.' + $v.MinorVersion"`) do set "UEVER=%%V"
if not defined UEVER for %%V in ("%UE%") do set "UEVER=%%~nxV"
set "UEVER=%UEVER:UE_=%"
findstr /c:"\"EngineAssociation\": \"\"" Blackwood.uproject >nul && (
  powershell -NoProfile -Command "(Get-Content -Raw 'Blackwood.uproject') -replace '\"EngineAssociation\": \"\"', '\"EngineAssociation\": \"%UEVER%\"' | Set-Content -NoNewline -Encoding ASCII 'Blackwood.uproject'"
  echo Projet associe a Unreal %UEVER%
)

echo.
echo === [2/6] Fichiers extraits du jeu Godot ===
if not exist "SourceAssets\Meshes\SM_Calib_X.glb" (
  if exist "BLACKWOOD_UNREAL_SourceAssets.zip" (
    powershell -NoProfile -Command "Expand-Archive -Force 'BLACKWOOD_UNREAL_SourceAssets.zip' '.'"
  ) else if exist "..\BLACKWOOD_UNREAL_SourceAssets.zip" (
    powershell -NoProfile -Command "Expand-Archive -Force '..\BLACKWOOD_UNREAL_SourceAssets.zip' '.'"
  )
)
if not exist "SourceAssets\Meshes\SM_Calib_X.glb" (
  echo Maillages absents : placer BLACKWOOD_UNREAL_SourceAssets.zip dans ce dossier puis relancer.
  goto :fail
)
if not exist "..\blackwood\assets\textures" (
  echo Le dossier "blackwood" - le jeu Godot - doit se trouver a cote de BLACKWOOD_UNREAL.
  goto :fail
)
echo OK

echo.
echo === [3/6] Mannequin provisoire (contenu Third Person d'Unreal) ===
if exist "Content\Characters\Mannequins" (
  echo Deja present.
) else (
  call :copy_mannequin
)

echo.
echo === [4/6] Compilation du code C++ (quelques minutes la premiere fois) ===
call "%~dp0Build.bat" "%UE%" > "Saved\Blackwood\build.log" 2>&1
if errorlevel 1 (
  echo ECHEC DE LA COMPILATION. Les erreurs sont dans Saved\Blackwood\build.log :
  findstr /i /c:"error" "Saved\Blackwood\build.log"
  goto :fail
)
echo Compilation reussie.

echo.
echo === [5/6] Import dans Unreal ===
echo L'editeur va s'ouvrir, importer les textures, materiaux, maillages, sons et donnees, construire
echo la carte, puis se fermer tout seul. Premiere ouverture : la compilation des shaders peut
echo prendre de 15 a 45 minutes. Ne pas fermer l'editeur pendant l'import.
if exist "Saved\Blackwood\import_report.txt" del /q "Saved\Blackwood\import_report.txt"
start "" /wait "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%CD%\Blackwood.uproject" -ExecutePythonScript="%~dp0import_all.py" -BWQuitAfterImport
if exist "Saved\Blackwood\import_report.txt" (
  type "Saved\Blackwood\import_report.txt"
) else (
  echo Rapport d'import absent : l'import ne s'est pas termine. Voir Saved\Logs\Blackwood.log
  goto :fail
)

echo.
echo === [6/6] Tests automatiques (comparaison avec la version Godot) ===
if exist "Saved\Automation\index.json" del /q "Saved\Automation\index.json"
call "%~dp0RunTests.bat" "%UE%" > "Saved\Blackwood\tests.log" 2>&1
if exist "Saved\Automation\index.json" (
  powershell -NoProfile -Command "$r = Get-Content -Raw 'Saved\Automation\index.json' | ConvertFrom-Json; Write-Host ('Tests reussis : ' + $r.succeeded + '   echoues : ' + $r.failed + '   non lances : ' + $r.notRun)"
) else (
  echo Rapport de tests absent : voir Saved\Blackwood\tests.log
)

echo.
echo TERMINE. Pour jouer : double-cliquer Blackwood.uproject, puis bouton Play (ou Alt+P).
echo Touche F3 : informations de debogage. Console (touche en haut a gauche, sous Echap) :
echo   BWFlag has_flashlight 1     BWTp 38.2 -4 -7.8     BWGive pistol
pause
exit /b 0

:copy_mannequin
set "MANNY="
for /f "delims=" %%F in ('dir /b /s "%UE%\Templates\SKM_Manny*.uasset" 2^>nul') do if not defined MANNY set "MANNY=%%~dpF"
if not defined MANNY (
  echo Mannequin introuvable dans le moteur : dans l'editeur, Content Drawer ^> Add ^> Add Feature or
  echo Content Pack ^> Third Person, puis relancer l'import. En attendant, Thomas sera invisible.
  exit /b 0
)
for %%P in ("%MANNY%..") do set "MANNEQUINS=%%~fP"
robocopy "%MANNEQUINS%" "Content\Characters\Mannequins" /E /NFL /NDL /NJH /NJS /NP >nul
echo Mannequin copie depuis %MANNEQUINS%
exit /b 0

:fail
echo.
echo Arret. Corriger le point ci-dessus puis relancer Scripts\SetupAll.bat.
echo En cas de doute, envoyer Saved\Blackwood\build.log ou Saved\Blackwood\import_report.txt.
pause
exit /b 1
