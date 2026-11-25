@echo off
cd /d "%~dp0"
echo [%date% %time%] Memulai WA Sender Watchdog... > wa-sender.log

:loop
node server.js >> wa-sender.log 2>&1
echo [%date% %time%] WA Sender berhenti, menyalakan ulang dalam 3 detik... >> wa-sender.log
timeout /t 3 /nobreak >nul
goto loop
