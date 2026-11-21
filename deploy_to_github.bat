@echo off
setlocal
echo ======================================================================
echo          JKSSB Prep Master - 1-Click GitHub Pages Deployer
echo ======================================================================
echo.
echo Make sure you have created an empty repository on GitHub first!
echo (Go to: https://github.com/new and name it: jkssb-prep-pwa)
echo.
set /p REPO_URL="Enter your GitHub Repository URL (or Username): "

if "%REPO_URL%"=="" (
    echo Error: No URL or username provided.
    pause
    exit /b
)

:: If user entered just a username, build the full URL
echo %REPO_URL% | findstr /i "github.com" >nul
if errorlevel 1 (
    set REPO_URL=https://github.com/%REPO_URL%/jkssb-prep-pwa.git
)

echo.
echo Linking to remote: %REPO_URL%
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing code to GitHub...
git push -u origin main

if errorlevel 0 (
    echo.
    echo ======================================================================
    echo [SUCCESS] Code pushed to GitHub!
    echo.
    echo Final Step: Enable GitHub Pages in 10 seconds:
    echo 1. Open your repository on GitHub in your browser
    echo 2. Click "Settings" (top menu) -> "Pages" (left sidebar)
    echo 3. Under "Branch", select "main" (root) and click "Save"
    echo.
    echo In about 1 minute, your app will be live and ready to share!
    echo ======================================================================
) else (
    echo.
    echo [ERROR] Push failed. Please verify your repository URL and GitHub login.
)

echo.
pause
