<#
.SYNOPSIS
Pruebas de endpoints HTTP para validar roles y autorización en Windows PowerShell.
#>

param(
    [string]$ApiUrl = $null,
    [string]$AdminEmail = $null,
    [string]$AdminPassword = $null,
    [string]$ResidentEmail = $null,
    [string]$ResidentPassword = $null
)

if (-not $ApiUrl) { $ApiUrl = $env:API_URL; if (-not $ApiUrl) { $ApiUrl = 'http://localhost:3000' } }
if (-not $AdminEmail) { $AdminEmail = $env:ADMIN_EMAIL; if (-not $AdminEmail) { $AdminEmail = 'admin@example.com' } }
if (-not $AdminPassword) { $AdminPassword = $env:ADMIN_PASSWORD; if (-not $AdminPassword) { $AdminPassword = 'admin-password' } }
if (-not $ResidentEmail) { $ResidentEmail = $env:RESIDENT_EMAIL; if (-not $ResidentEmail) { $ResidentEmail = 'residente@example.com' } }
if (-not $ResidentPassword) { $ResidentPassword = $env:RESIDENT_PASSWORD; if (-not $ResidentPassword) { $ResidentPassword = 'residente-password' } }

function Show-Header {
    param([string]$Text)
    Write-Host "`n===== $Text =====" -ForegroundColor Cyan
}

function Invoke-JsonRequest {
    param(
        [string]$Method = 'GET',
        [string]$Url,
        [hashtable]$Body = $null,
        $Session = $null
    )

    $headers = @{ 'Content-Type' = 'application/json' }
    $jsonBody = if ($Body) { $Body | ConvertTo-Json -Depth 5 } else { $null }

    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $jsonBody -WebSession $Session -UseBasicParsing -ErrorAction Stop
}

function Login-User {
    param(
        [string]$Email,
        [string]$Password,
        [string]$SessionVar
    )
    Show-Header "Login: $Email"
    $headers = @{ 'Content-Type' = 'application/json' }
    $body = @{ correo = $Email; password = $Password } | ConvertTo-Json -Depth 5
    Invoke-WebRequest -Method 'POST' -Uri "$ApiUrl/api/login" -Headers $headers -Body $body -SessionVariable $SessionVar -UseBasicParsing -ErrorAction Stop | Out-Null
    return Get-Variable -Name $SessionVar -ValueOnly
}

function Test-ActualizacionGet {
    param($Session, [string]$Role)
    Show-Header "GET /api/actualizacion-datos ($Role)"
    Invoke-JsonRequest -Url "$ApiUrl/api/actualizacion-datos" -Session $Session | ConvertTo-Json
}

function Test-ActualizacionPut {
    param($Session, [string]$Role, [hashtable]$Body)
    Show-Header "PUT /api/actualizacion-datos ($Role)"
    Invoke-JsonRequest -Method 'PUT' -Url "$ApiUrl/api/actualizacion-datos" -Body $Body -Session $Session | ConvertTo-Json
}

function Test-SemanaGet {
    param($Session, [string]$Role, [string]$SemanaKey)
    Show-Header "GET /api/semana?semanaKey=$SemanaKey ($Role)"
    Invoke-JsonRequest -Url "$ApiUrl/api/semana?semanaKey=$SemanaKey" -Session $Session | ConvertTo-Json
}

function Test-PorteriaAuth {
    param([string]$Pin)
    Show-Header "POST /api/porteria/auth pin=$Pin"
    Invoke-JsonRequest -Method 'POST' -Url "$ApiUrl/api/porteria/auth" -Body @{ pin = $Pin } | ConvertTo-Json
}

function Test-ExcelAdmin {
    param($Session)
    Show-Header "GET /api/excel (admin)"
    $response = Invoke-WebRequest -Uri "$ApiUrl/api/excel" -WebSession $Session -UseBasicParsing -Method Get -ErrorAction Stop
    Write-Host "HTTP Status: $($response.StatusCode)"
    Write-Host "Content-Type: $($response.Headers['Content-Type'])"
}

# Run tests
$adminSession = Login-User -Email $AdminEmail -Password $AdminPassword -SessionVar 'adminSession'
$residentSession = Login-User -Email $ResidentEmail -Password $ResidentPassword -SessionVar 'residentSession'

Test-ActualizacionGet -Session $adminSession -Role 'admin'
Test-ActualizacionGet -Session $residentSession -Role 'resident'

Test-ActualizacionPut -Session $residentSession -Role 'resident' -Body @{ casa_id = 1; nombre_propietario = 'Prueba Residente'; celular = '3001234567' }

Test-SemanaGet -Session $adminSession -Role 'admin' -SemanaKey 'semana-1'
Test-SemanaGet -Session $residentSession -Role 'resident' -SemanaKey 'semana-1'

Test-PorteriaAuth -Pin '1234'
Test-PorteriaAuth -Pin '0000'

Test-ExcelAdmin -Session $adminSession

Write-Host "`nPruebas completadas." -ForegroundColor Green
