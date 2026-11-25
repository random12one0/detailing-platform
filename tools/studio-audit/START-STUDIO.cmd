@echo off
rem Starts the Website Studio and the site Audit on http://127.0.0.1:5300/  (needs only Node 22+, no npm install).
rem The Studio works on a COPY of this repo at C:\studio-work\s1 (it refuses the real repo). The first run makes the copy.
cd /d "%~dp0..\.."
if not exist C:\studio-work\s1\scripts\studio\studio-check.mjs (
  echo Making the platform copy at C:\studio-work\s1 ...
  git worktree add --detach C:\studio-work\s1 HEAD
  if exist app\node_modules if not exist C:\studio-work\s1\app\node_modules mklink /J C:\studio-work\s1\app\node_modules "%cd%\app\node_modules"
)
start "" http://127.0.0.1:5300/
node tools\studio-audit\server.mjs
pause
