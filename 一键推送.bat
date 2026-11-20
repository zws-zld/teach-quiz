@echo off
cd /d "%~dp0"
echo ============================================================
echo   teacher-quiz one-click push
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not found.
  echo Install Git from https://git-scm.com/download/win
  echo Then restart this script.
  echo.
  pause
  exit /b
)

echo BEFORE YOU START (do this on github.com):
echo  1. Create a NEW PRIVATE EMPTY repo named: teacher-quiz
echo     Do NOT add README / .gitignore / license.
echo  2. Copy its URL, like: https://github.com/zws-zld/teacher-quiz.git
echo.
set /p "REPO=Paste repo URL then press Enter: "

git remote remove origin 2>nul
git remote add origin %REPO%
git branch -M main
echo.
echo Pushing now. If a login box appears:
echo   username = zws-zld
echo   password = your GitHub Personal Access Token (with repo scope)
echo.
git push -u origin main

echo.
if errorlevel 1 (
  echo [FAILED] Check: URL correct / PAT entered / PAT has repo scope.
) else (
  echo [SUCCESS] Push done. Send the repo URL to the other session.
)
echo.
pause
