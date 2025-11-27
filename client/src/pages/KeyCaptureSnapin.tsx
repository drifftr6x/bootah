// This is a reference implementation for the key capture snapin
// In production, this would be packaged as PowerShell/Bash script delivered via snapins

export const keyCapturePowerShellScript = `
# Bootah Product Key Capture Snapin
# This script extracts Windows product keys and sends them back to Bootah

[CmdletBinding()]
param(
  [string]$BootahServerUrl = "http://192.168.1.100:5000",
  [string]$DeploymentId = $env:BOOTAH_DEPLOYMENT_ID,
  [string]$DeviceId = $env:BOOTAH_DEVICE_ID
)

function Get-ProductKeys {
  Write-Host "[KeyCapture] Extracting Windows product keys..."
  $keys = @()
  
  # Windows Product Key
  try {
    $osKey = (Get-WmiObject -query 'select * from SoftwareLicensingService').OA3xOriginalProductKey
    if ($osKey) {
      $keys += @{
        productName = "Windows"
        productKey = $osKey
        keyType = "oem"
        osType = "windows"
        version = (Get-WmiObject -Class Win32_OperatingSystem).Caption -replace "Microsoft ", ""
      }
      Write-Host "[KeyCapture] Windows key found: $($osKey.Substring(0,5))****"
    }
  } catch {
    Write-Warning "[KeyCapture] Failed to extract Windows key: $_"
  }
  
  # Office Product Key (if installed)
  try {
    $officeKey = (Get-WmiObject -namespace "root\\cimv2" -class "SoftwareLicensingProduct" | 
      Where-Object { $_.Name -match "Office" -and $_.LicenseStatus -eq 1 } | 
      Select-Object -First 1).PartialProductKey
    
    if ($officeKey) {
      $keys += @{
        productName = "Microsoft Office"
        productKey = $officeKey
        keyType = "mak"
        osType = "windows"
        version = "2021"
      }
      Write-Host "[KeyCapture] Office key found: ****$($officeKey.Substring($officeKey.Length - 5))"
    }
  } catch {
    Write-Warning "[KeyCapture] Failed to extract Office key: $_"
  }
  
  return $keys
}

function Send-KeysToBootah {
  param([array]$Keys)
  
  $url = "$BootahServerUrl/api/post-deployment/product-keys/capture"
  
  $body = @{
    deploymentId = $DeploymentId
    deviceId = $DeviceId
    keys = $Keys
    capturedAt = (Get-Date -AsUTC -Format "o")
  } | ConvertTo-Json
  
  try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "[KeyCapture] Successfully sent $($Keys.Count) key(s) to Bootah"
    return $true
  } catch {
    Write-Warning "[KeyCapture] Failed to send keys to Bootah: $_"
    return $false
  }
}

# Main execution
$keys = Get-ProductKeys
if ($keys.Count -gt 0) {
  Send-KeysToBootah -Keys $keys
} else {
  Write-Warning "[KeyCapture] No product keys found to capture"
}
`;

export const keyCaptureDescription = 
`Key Capture Snapin - Automatically extracts and registers Windows product keys after deployment.

Features:
- Extracts Windows OS product keys
- Extracts installed Office license keys
- Sends keys securely to Bootah server
- Tracks key source (device + deployment)
- Supports MAK and OEM key types
- Fully encrypted key storage

Usage:
1. Add this snapin to a Post-Deployment Profile
2. Snapin runs automatically after deployment completes
3. Captured keys appear in Product Keys section
4. Keys can be reused for future deployments
`;
