@echo off
setlocal enabledelayedexpansion

:: Set console to UTF-8 encoding
chcp 65001 > nul

:: Set the title of the console window
title Git Commit Switcher

echo.
echo ===================================================
echo        Git Commit Switcher
echo ===================================================
echo This tool will completely restore your code to the selected commit
echo WARNING: All uncommitted changes will be lost!
echo.

:: Check if in a git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Current directory is not a git repository
    goto :end
)

:: Display current branch
for /f "tokens=*" %%a in ('git branch --show-current') do set "CURRENT_BRANCH=%%a"
echo Current branch: !CURRENT_BRANCH!
echo.

:: Ask for number of commits to display
set "COMMIT_COUNT=10"
echo How many recent commits would you like to see? (default: 10)
set /p COMMIT_COUNT="> "

:: Validate input is a number
echo !COMMIT_COUNT!| findstr /r "^[1-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo Invalid input. Using default: 10 commits
    set "COMMIT_COUNT=10"
)

:: Configure git to properly handle non-ASCII characters
git config --local core.quotepath false
git config --local i18n.logoutputencoding utf-8
git config --local i18n.commitencoding utf-8

:: Create temporary file to store commit records
set "TEMP_FILE=%TEMP%\git_commits_%RANDOM%.txt"
git log -!COMMIT_COUNT! --pretty=format:"%%h||%%ad||%%an||%%s" --date=short > "!TEMP_FILE!"

:: Store commits in an array
set "LINE_INDEX=1"
for /f "usebackq tokens=1-4 delims=||" %%a in ("!TEMP_FILE!") do (
    set "HASH_!LINE_INDEX!=%%a"
    set "DATE_!LINE_INDEX!=%%b"
    set "AUTHOR_!LINE_INDEX!=%%c"
    set "MSG_!LINE_INDEX!=%%d"
    set /a "LINE_INDEX+=1"
)

:: Count total lines in the file
set "TOTAL_LINES=0"
for /f "usebackq" %%a in ("!TEMP_FILE!") do set /a "TOTAL_LINES+=1"

:: Display commits in reverse order (newest at the bottom)
echo Commits (oldest to newest):
echo ===================================================
echo.
set "INDEX=1"
for /l %%i in (1,1,!TOTAL_LINES!) do (
    echo ===================================================
    echo !INDEX!. [!DATE_%%i!] !MSG_%%i!
    echo    Author: !AUTHOR_%%i!
    echo    Commit: !HASH_%%i!

    :: Get files changed in this commit
    set "TEMP_FILES=%TEMP%\git_files_%RANDOM%.txt"
    git show --name-status --oneline !HASH_%%i! > "!TEMP_FILES!"

    :: Display first 5 changed files (if any)
    echo    Changed files:
    set "FILE_COUNT=0"
    for /f "skip=1 tokens=1,*" %%x in ('type "!TEMP_FILES!"') do (
        set /a "FILE_COUNT+=1"
        if !FILE_COUNT! leq 5 (
            if "%%y"=="" (
                echo       %%x
            ) else (
                echo       %%x %%y
            )
        )
    )

    :: Show if there are more files
    if !FILE_COUNT! gtr 5 (
        set /a "REMAINING=!FILE_COUNT!-5"
        echo       ... and !REMAINING! more files
    )

    :: Delete temporary file
    del "!TEMP_FILES!" >nul 2>&1
    echo.

    :: Store commit hash in array
    set "COMMIT_!INDEX!=!HASH_%%i!"

    set /a "INDEX+=1"
)

:: Delete temporary file
del "!TEMP_FILE!" >nul 2>&1

:: Calculate actual commit count
set /a "COMMIT_COUNT=!INDEX!-1"

:: Prompt user to select a commit
echo Enter the number of the commit to switch to (1-!COMMIT_COUNT!):
set /p COMMIT_INDEX="> "

:: Validate input is a number
echo !COMMIT_INDEX!| findstr /r "^[1-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo Error: Please enter a valid number
    goto :end
)

:: Validate input range
if !COMMIT_INDEX! LSS 1 (
    echo Error: Number must be greater than or equal to 1
    goto :end
)
if !COMMIT_INDEX! GTR !COMMIT_COUNT! (
    echo Error: Number must be less than or equal to !COMMIT_COUNT!
    goto :end
)

:: Get selected commit hash
set "COMMIT_HASH=!COMMIT_%COMMIT_INDEX%!"

:: Display selected commit details
echo.
echo You selected:
echo ===================================================
git log -1 --pretty=format:"Commit: %%h%%nAuthor: %%an %%nDate: %%ad%%n%%n    %%s%%n%%n%%b" !COMMIT_HASH!
echo.

:: Show files changed in the selected commit
echo.
echo Files changed in this commit:
echo ===================================================

:: Create a temporary file to store the file list
set "TEMP_SELECTED=%TEMP%\git_selected_%RANDOM%.txt"
git show --name-status !COMMIT_HASH! > "!TEMP_SELECTED!"

:: Extract and display the changed files
for /f "tokens=1,*" %%x in ('findstr /R /C:"^[AMDRT]" "!TEMP_SELECTED!"') do (
    echo    %%x %%y
)

:: Delete the temporary file
del "!TEMP_SELECTED!" >nul 2>&1
echo.
echo.

:: Check for uncommitted changes
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo WARNING: You have uncommitted changes that will be lost!
    echo.
)

:: Confirm operation
echo This will completely restore your code to the selected commit.
echo All changes made after this commit will be lost.
echo.
echo Confirm this operation? [Y/N]
set /p CONFIRM="> "
if /i "!CONFIRM!" neq "Y" (
    echo Operation cancelled
    goto :end
)

:: Execute git reset
echo.
echo Switching to commit !COMMIT_HASH! ...
git reset --hard !COMMIT_HASH!

if %errorlevel% neq 0 (
    echo Error: git reset command failed
    goto :end
)

echo.
echo ===================================================
echo        Switch operation completed successfully
echo ===================================================
echo.

:: Display current status
git status
echo.

:end
:: Restore git config to default
git config --local --unset core.quotepath
git config --local --unset i18n.logoutputencoding
git config --local --unset i18n.commitencoding

endlocal
