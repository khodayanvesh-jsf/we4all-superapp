[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$orderId  = "0fe516f8-3461-49f7-adaa-94d138a4edc2"
$cliAgent = "we4all-cli/1.0"
$delaySec = 4

$envMap = @{}
foreach ($f in @(".env", ".env.local")) {
  if (Test-Path $f) {
    Get-Content $f | ForEach-Object {
      if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$') {
        $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
      }
    }
  }
}

$supabaseUrl = if ($env:VITE_SUPABASE_URL) { $env:VITE_SUPABASE_URL } elseif ($envMap["VITE_SUPABASE_URL"]) { $envMap["VITE_SUPABASE_URL"] } else { (Read-Host "Enter VITE_SUPABASE_URL").Trim() }
$supabaseUrl = $supabaseUrl.TrimEnd('/')
$anonKey     = if ($env:VITE_SUPABASE_ANON_KEY) { $env:VITE_SUPABASE_ANON_KEY } elseif ($envMap["VITE_SUPABASE_ANON_KEY"]) { $envMap["VITE_SUPABASE_ANON_KEY"] } else { "" }

$sec = Read-Host "Paste Supabase sb_secret_ key (or legacy service_role JWT)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try { $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr).Trim() }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

$headers = @{
  "Content-Type" = "application/json"
  "Prefer"       = "return=representation"
}
if ($key.StartsWith("sb_secret_")) {
  $headers["apikey"] = $key
} else {
  $headers["apikey"]        = if ($anonKey) { $anonKey } else { $key }
  $headers["Authorization"] = "Bearer $key"
}

$endpoint = "$supabaseUrl/rest/v1/we4all_orders?id=eq.$orderId"

function Send-OrderPatch {
  param([string]$Label, [hashtable]$Payload)
  $Payload["updated_at"] = (Get-Date).ToUniversalTime().ToString("o")
  $json = $Payload | ConvertTo-Json -Compress
  try {
    $res = Invoke-RestMethod -Method Patch -Uri $endpoint -Headers $headers -UserAgent $cliAgent -Body $json
    if (-not $res -or $res.Count -eq 0) {
      Write-Host "[$Label] 0 rows updated (check RLS or key)." -ForegroundColor Yellow
    } else {
      Write-Host "[$Label] -> status=$($res[0].status) | payment_status=$($res[0].payment_status) | cod_collected_at=$($res[0].cod_collected_at)" -ForegroundColor Green
    }
  } catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $msg = $reader.ReadToEnd()
    }
    Write-Host "[$Label] ERROR: $msg" -ForegroundColor Red
  }
}

$steps = @(
  @{ Label = "1/6 Preparing";        Body = @{ status = "preparing" } },
  @{ Label = "2/6 Ready for Pickup"; Body = @{ status = "ready_for_pickup" } },
  @{ Label = "3/6 Picked Up (Rider)";Body = @{ status = "picked_up" } },
  @{ Label = "4/6 COD Collected";    Body = @{ payment_status = "paid"; cod_collected_at = (Get-Date).ToUniversalTime().ToString("o") } },
  @{ Label = "5/6 Delivered";        Body = @{ status = "delivered" } },
  @{ Label = "6/6 Reset Baseline";   Body = @{ status = "accepted"; payment_status = "pending"; cod_collected_at = $null } }
)

foreach ($s in $steps) {
  Send-OrderPatch -Label $s.Label -Payload $s.Body
  Start-Sleep -Seconds $delaySec
}

Write-Host "`nAll 6 valid we4all_orders transitions finished." -ForegroundColor Cyan