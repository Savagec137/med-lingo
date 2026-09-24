@echo off
setlocal
rem COOP (test local) : un hote (serveur d'ecoute) et un invite connecte en 127.0.0.1:24890.
call "%~dp0_FindEngine.bat" %1 || exit /b 1
start "Blackwood - hote" "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0..\Blackwood.uproject" "/Game/Blackwood/Maps/L_BlackwoodHospital?listen" -game -windowed -ResX=960 -ResY=540 -WinX=0 -WinY=40 -log
timeout /t 20 /nobreak >nul
start "Blackwood - invite" "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0..\Blackwood.uproject" 127.0.0.1:24890 -game -windowed -ResX=960 -ResY=540 -WinX=960 -WinY=40 -log
