@echo off
setlocal
rem IMPORT : ouvre l'editeur et execute Scripts\import_all.py (textures, materiaux, maillages,
rem sons, donnees, construction de la carte). Rapport : Saved\Blackwood\import_report.txt
call "%~dp0_FindEngine.bat" %1 || exit /b 1
"%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0..\Blackwood.uproject" -ExecutePythonScript="%~dp0import_all.py"
