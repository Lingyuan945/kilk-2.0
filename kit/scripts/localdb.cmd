@echo off
rem kilk 2.0 local database helper (PostgreSQL 16 portable)
rem usage: localdb.cmd start ^| stop ^| status ^| psql ^| restore [dump]
setlocal

set "ROOT=%~dp0..\.."
pushd "%ROOT%" >nul
set "ROOT=%CD%"
popd >nul

set "PGBIN=%ROOT%\kit\private\tools\pg16\pgsql\bin"
set "PGDATA=%ROOT%\kit\private\pgdata"
set "PGLOG=%ROOT%\kit\private\pgdata.log"
set "DUMP=%ROOT%\server\data-export\kilk.sql"

if not exist "%PGBIN%\pg_ctl.exe" goto nopg

if /I "%1"=="start" goto start
if /I "%1"=="stop" goto stop
if /I "%1"=="status" goto status
if /I "%1"=="psql" goto psql
if /I "%1"=="restore" goto restore

echo usage: localdb.cmd start ^| stop ^| status ^| psql ^| restore [dump path]
exit /b 1

:nopg
echo [ERROR] PostgreSQL not found at %PGBIN%
exit /b 1

:start
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432" -w start
"%PGBIN%\pg_isready.exe" -h 127.0.0.1 -p 5432
exit /b 0

:stop
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -m fast -w stop
exit /b 0

:status
"%PGBIN%\pg_isready.exe" -h 127.0.0.1 -p 5432
exit /b 0

:psql
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d kilk
exit /b 0

:restore
if not "%2"=="" set "DUMP=%~2"
if not exist "%DUMP%" goto nodump
echo rebuilding local database kilk from %DUMP%
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "DROP DATABASE IF EXISTS kilk WITH (FORCE)"
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE kilk ENCODING 'UTF8' TEMPLATE template0"
"%PGBIN%\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d kilk -v ON_ERROR_STOP=1 -f "%DUMP%"
echo restore done
exit /b 0

:nodump
echo [ERROR] dump not found: %DUMP%
exit /b 1
