@echo off
setlocal
rem IMPORT : ouvre l'éditeur et exécute Scripts\import_all.py (textures, matériaux, maillages,
rem sons, données, construction de la carte). Rapport : Saved\Blackwood\import_report.txt
call "%~dp0_FindEngine.bat" %1 || exit /b 1
"%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0..\Blackwood.uproject" -ExecutePythonScript="%~dp0import_all.py"
