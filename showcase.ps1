$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$startedProcesses = @()
$terminalStatuses = @("PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED")

function Invoke-JsonRequest {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [object]$Body
    )

    $params = @{
        Uri = $Uri
        Method = $Method
    }

    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = $Body | ConvertTo-Json -Depth 20
    } elseif ($Method -ne "Get") {
        $params.ContentType = "application/json"
        $params.Body = "{}"
    }

    return Invoke-RestMethod @params
}

function Wait-ForService {
    param(
        [string]$Uri,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    } while ((Get-Date) -lt $deadline)

    throw "Service did not become ready: $Uri"
}

function Start-WorkspaceService {
    param(
        [string]$Command,
        [string]$LogName
    )

    $logPath = Join-Path $env:TEMP "ojastra-$LogName.out.log"
    $errorLogPath = Join-Path $env:TEMP "ojastra-$LogName.err.log"
    $process = Start-Process `
        -FilePath "pnpm.cmd" `
        -ArgumentList $Command `
        -WorkingDirectory $PSScriptRoot `
        -RedirectStandardOutput $logPath `
        -RedirectStandardError $errorLogPath `
        -PassThru

    $script:startedProcesses += $process
    return $process
}

function Run-OjastraTest {
    param(
        [string]$Label,
        [string]$ScenarioId = ""
    )

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor DarkGray
    Write-Host $Label -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor DarkGray

    Invoke-JsonRequest `
        -Uri "http://localhost:3001/api/fixtures/reset" `
        -Method "Post" |
        Out-Null

    $body = @{
        testId = "checkout-valid-card"
        contractVersion = 1
    }

    if ($ScenarioId -ne "") {
        $body.mutationScenarioId = $ScenarioId
    }

    $created = Invoke-JsonRequest `
        -Uri "http://localhost:3000/api/runs" `
        -Method "Post" `
        -Body $body

    $runId = $created.runId
    $result = $null

    for ($attempt = 1; $attempt -le 40; $attempt++) {
        Start-Sleep -Seconds 1
        $result = Invoke-JsonRequest -Uri "http://localhost:3000/api/runs/$runId"
        Write-Host "Status: $($result.run.status)"

        if ($terminalStatuses -contains $result.run.status) {
            break
        }
    }

    if ($null -eq $result -or $terminalStatuses -notcontains $result.run.status) {
        throw "Run did not reach a terminal status: $runId"
    }

    Write-Host ""
    Write-Host "FINAL RESULT: $($result.run.status)" -ForegroundColor Green
    Write-Host "Recovery count: $($result.run.recovery_count)"
    Write-Host "Error code: $($result.run.error_code)"
    Write-Host "Events: $($result.events.Count)"
    Write-Host "Artifacts: $($result.artifacts.Count)"

    if ($result.recoveryAttempts.Count -gt 0) {
        $attempt = $result.recoveryAttempts[0]
        Write-Host "Policy decision: $($attempt.policy_decision)" -ForegroundColor Yellow
        Write-Host "Reason codes: $($attempt.reasonCodes -join ', ')"
    }

    Write-Host "Run detail: http://localhost:3000/api/runs/$runId" -ForegroundColor DarkCyan
    return $result
}

try {
    Write-Host "Ojastra terminal showcase" -ForegroundColor Cyan
    Write-Host "Starting backend services..."

    $demoProcess = Start-WorkspaceService -Command "dev:demo" -LogName "demo"
    $apiProcess = Start-WorkspaceService -Command "dev:api" -LogName "api"

    Wait-ForService -Uri "http://localhost:3001/"
    Wait-ForService -Uri "http://localhost:3000/api/health"

    $health = Invoke-JsonRequest -Uri "http://localhost:3000/api/health"
    Write-Host "API: $($health.status) ($($health.service))" -ForegroundColor Green
    Write-Host "Demo: ready on http://localhost:3001" -ForegroundColor Green

    Invoke-JsonRequest `
        -Uri "http://localhost:3000/api/runs/clear" `
        -Method "Post" |
        Out-Null

    $baseline = Run-OjastraTest -Label "1. NORMAL BASELINE" 
    $healed = Run-OjastraTest -Label "2. SAFE UI DRIFT RECOVERY" -ScenarioId "M01_RENAME_TARGET"
    $failed = Run-OjastraTest -Label "3. REAL BUSINESS FAILURE" -ScenarioId "M06_WRONG_TOTAL"
    $review = Run-OjastraTest -Label "4. AMBIGUOUS CANDIDATE" -ScenarioId "M05_DUPLICATE_LABEL"

    Write-Host ""
    Write-Host "================ BENCHMARK ================" -ForegroundColor Cyan
    $benchmark = Invoke-JsonRequest -Uri "http://localhost:3000/api/benchmark"
    $benchmark |
        Select-Object totalRuns, passedCount, healedCount, failedCount,
            reviewRequiredCount, benignRecoveryRate, falseHealRate,
            safeAbstentionRate, modelInvocationCount |
        Format-List

    Write-Host "================ SCENARIOS ================" -ForegroundColor Cyan
    $benchmark.scenarios |
        Select-Object scenarioId, expectedOutcome, totalRuns, passedRuns,
            healedRuns, failedRuns, reviewRequiredRuns, accuracyRate |
        Format-Table -AutoSize

    Write-Host "================ EVIDENCE ================" -ForegroundColor Cyan
    foreach ($run in @($baseline, $healed, $failed, $review)) {
        Write-Host "$($run.run.status): storage\runs\$($run.run.id)"
    }

    Write-Host ""
    Write-Host "================ AUTOMATED SUITE ================" -ForegroundColor Cyan
    & pnpm.cmd test:e2e
    if ($LASTEXITCODE -ne 0) {
        throw "The automated E2E suite failed with exit code $LASTEXITCODE."
    }

    Write-Host ""
    Write-Host "SHOWCASE COMPLETE: all lifecycle cases and automated tests passed." -ForegroundColor Green
} finally {
    foreach ($process in $startedProcesses) {
        if ($null -ne $process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
