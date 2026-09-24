@echo off
setlocal
rem COMPILE : module C++ Blackwood (cible éditeur). Usage : Scripts\Build.bat [dossier du moteur]
call "%~dp0_FindEngine.bat" %1 || exit /b 1
call "%UE%\Engine\Build\BatchFiles\Build.bat" BlackwoodEditor Win64 Development -Project="%~dp0..\Blackwood.uproject" -WaitMutex
exit /b %ERRORLEVEL%
