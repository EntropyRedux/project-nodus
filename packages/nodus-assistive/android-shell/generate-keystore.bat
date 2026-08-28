@echo off
echo ============================================
echo Nodus Home Release Keystore Generator
echo ============================================
echo.

REM Check if keytool is available
where keytool >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: keytool not found. Please ensure Java JDK is installed and in your PATH.
    echo You can download JDK from: https://www.oracle.com/java/technologies/downloads/
    exit /b 1
)

echo This will generate a release keystore for signing the Nodus Home APK.
echo The keystore will be saved as: nodus-release.keystore
echo.
set /p KEY_ALIAS="Enter key alias (default: nodus-key): "
if "%KEY_ALIAS%"=="" set KEY_ALIAS=nodus-key

set /p KEY_PASSWORD="Enter key password: "
if "%KEY_PASSWORD%"=="" (
    echo ERROR: Key password cannot be empty
    exit /b 1
)

set /p STORE_PASSWORD="Enter keystore password (press Enter to use same as key password): "
if "%STORE_PASSWORD%"=="" set STORE_PASSWORD=%KEY_PASSWORD%

set /p KEY_DNAME="Enter your name (e.g., John Doe): "
if "%KEY_DNAME%"=="" set KEY_DNAME=Nodus Developer

set /p KEY_ORG="Enter organization (e.g., Nodus Project): "
if "%KEY_ORG%"=="" set KEY_ORG=Nodus Project

set /p KEY_COUNTRY="Enter country code (e.g., US): "
if "%KEY_COUNTRY%"=="" set KEY_COUNTRY=US

echo.
echo Generating keystore...
keytool -genkey -v -keystore nodus-release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias %KEY_ALIAS% -dname "CN=%KEY_DNAME%, O=%KEY_ORG%, C=%KEY_COUNTRY%" -storepass %STORE_PASSWORD% -keypass %KEY_PASSWORD%

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate keystore
    exit /b 1
)

echo.
echo Creating keystore.properties file...
echo keyAlias=%KEY_ALIAS%> keystore.properties
echo keyPassword=%KEY_PASSWORD%>> keystore.properties
echo storeFile=nodus-release.keystore>> keystore.properties
echo storePassword=%STORE_PASSWORD%>> keystore.properties

echo.
echo ============================================
echo Keystore generated successfully!
echo ============================================
echo.
echo IMPORTANT: Keep your keystore file and passwords secure!
echo - Never commit nodus-release.keystore to version control
echo - Never commit keystore.properties to version control
echo - Store keystore.properties.example as a template
echo.
echo You can now build a signed release APK with:
echo   gradlew.bat assembleRelease
echo.
echo The signed APK will be located at:
echo   app\build\outputs\apk\release\app-release.apk
echo.