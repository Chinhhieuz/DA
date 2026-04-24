$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$emulatorPath = "$sdkPath\emulator\emulator.exe"
$adbPath = "$sdkPath\platform-tools\adb.exe"

Write-Host "Starting emulator Pixel_6_API33..." -ForegroundColor Cyan
Start-Process -FilePath $emulatorPath -ArgumentList "-avd", "Pixel_6_API33", "-netdelay", "none", "-netspeed", "full"

Write-Host "Waiting for device to connect to ADB..." -ForegroundColor Yellow
$timeout = 60
$elapsed = 0
while ($elapsed -lt $timeout) {
    $devices = & $adbPath devices
    if ($devices -match "emulator-5554\s+device") {
        Write-Host "Emulator connected!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($elapsed -ge $timeout) {
    Write-Host "Timeout waiting for emulator. Please check if it's running." -ForegroundColor Red
} else {
    Write-Host "Ready! You can now run: flutter run" -ForegroundColor Cyan
}
