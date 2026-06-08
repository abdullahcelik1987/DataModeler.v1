param(
    [string]$ChangeRequestId = "af1187ec-b59b-4f52-a5a9-c97dbdfce271"
)

$ErrorActionPreference = "Stop"

function New-TestJwt {
    param(
        [Parameter(Mandatory = $true)][string]$UserId,
        [Parameter(Mandatory = $true)][string]$Email
    )

    $secret = "DefaultSecretKeyChangeInProduction!2024"
    $issuer = "DataModeler"
    $audience = "DataModelerApp"

    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $exp = $now + 3600

    $headerJson = '{"alg":"HS256","typ":"JWT"}'
    $payloadObject = [ordered]@{
        sub = $UserId
        email = $Email
        iat = $now
        exp = $exp
        iss = $issuer
        aud = $audience
    }
    $payloadJson = $payloadObject | ConvertTo-Json -Compress

    function To-Base64Url {
        param([byte[]]$Bytes)

        return [Convert]::ToBase64String($Bytes).TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_')
    }

    $encodedHeader = To-Base64Url ([Text.Encoding]::UTF8.GetBytes($headerJson))
    $encodedPayload = To-Base64Url ([Text.Encoding]::UTF8.GetBytes($payloadJson))
    $unsignedToken = "$encodedHeader.$encodedPayload"

    $hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
    $signature = To-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($unsignedToken)))

    return "$unsignedToken.$signature"
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$UserId,
        [Parameter(Mandatory = $true)][string]$Email,
        [string]$BodyJson = ""
    )

    $token = New-TestJwt -UserId $UserId -Email $Email
    $headers = @{ Authorization = "Bearer $token" }

    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method GET -Headers $headers
        }
        else {
            $response = Invoke-WebRequest -Uri $Url -Method POST -Headers $headers -ContentType "application/json" -Body $BodyJson
        }

        return [pscustomobject]@{
            status = [int]$response.StatusCode
            body = $response.Content
        }
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()

        return [pscustomobject]@{
            status = $statusCode
            body = $body
        }
    }
}

$baseUrl = "http://localhost:8080/api/change-requests"
$payload = '{"comment":"api auth e2e test"}'

Write-Output "=== SCENARIO SETUP ==="
Write-Output "ChangeRequestId=$ChangeRequestId"

$before = Invoke-Api -Method GET -Url "$baseUrl/$ChangeRequestId" -UserId "a176b4e6-4089-4e4b-8265-29075cb53557" -Email "barchitect2@kurumsal.local"
Write-Output "before_get_http=$($before.status)"
Write-Output $before.body

Write-Output "=== APPROVE TESTS ==="
$approveDataArchitect = Invoke-Api -Method POST -Url "$baseUrl/$ChangeRequestId/approve" -UserId "8a09537d-5c29-4ffc-94d9-8b771f56618d" -Email "darchitect@kurumsal.local" -BodyJson $payload
Write-Output "approve_darchitect_http=$($approveDataArchitect.status)"
Write-Output $approveDataArchitect.body

$approveBusinessArchitectOu1 = Invoke-Api -Method POST -Url "$baseUrl/$ChangeRequestId/approve" -UserId "81177517-7ca6-4dde-acb9-03cc0f4d996e" -Email "barchitect@kurumsal.local" -BodyJson $payload
Write-Output "approve_barchitect_http=$($approveBusinessArchitectOu1.status)"
Write-Output $approveBusinessArchitectOu1.body

$approveBusinessArchitectOu2 = Invoke-Api -Method POST -Url "$baseUrl/$ChangeRequestId/approve" -UserId "a176b4e6-4089-4e4b-8265-29075cb53557" -Email "barchitect2@kurumsal.local" -BodyJson $payload
Write-Output "approve_barchitect2_http=$($approveBusinessArchitectOu2.status)"
Write-Output $approveBusinessArchitectOu2.body

$afterApprove = Invoke-Api -Method GET -Url "$baseUrl/$ChangeRequestId" -UserId "a176b4e6-4089-4e4b-8265-29075cb53557" -Email "barchitect2@kurumsal.local"
Write-Output "after_approve_get_http=$($afterApprove.status)"
Write-Output $afterApprove.body

Write-Output "=== REJECT TESTS ==="
$rejectBusinessArchitectOu1 = Invoke-Api -Method POST -Url "$baseUrl/$ChangeRequestId/reject" -UserId "81177517-7ca6-4dde-acb9-03cc0f4d996e" -Email "barchitect@kurumsal.local" -BodyJson $payload
Write-Output "reject_barchitect_http=$($rejectBusinessArchitectOu1.status)"
Write-Output $rejectBusinessArchitectOu1.body

$rejectDataArchitect = Invoke-Api -Method POST -Url "$baseUrl/$ChangeRequestId/reject" -UserId "8a09537d-5c29-4ffc-94d9-8b771f56618d" -Email "darchitect@kurumsal.local" -BodyJson $payload
Write-Output "reject_darchitect_http=$($rejectDataArchitect.status)"
Write-Output $rejectDataArchitect.body

$afterReject = Invoke-Api -Method GET -Url "$baseUrl/$ChangeRequestId" -UserId "a176b4e6-4089-4e4b-8265-29075cb53557" -Email "barchitect2@kurumsal.local"
Write-Output "after_reject_get_http=$($afterReject.status)"
Write-Output $afterReject.body
