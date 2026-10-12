# Comprehensive Real Verification for All 8 Mutation Scenarios + Baseline
# Runs against live Ojastra API (http://localhost:3000) and Demo App (http://localhost:3001)
# Zero LLM token burn - utilizes local TF-IDF Vector Space Engine and Playwright automation

$ErrorActionPreference = "Stop"

$API_BASE = "http://localhost:3000/api"
$DEMO_BASE = "http://localhost:3001/api"
$terminalStatuses = @("PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED")

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       OJASTRA (LEXIQUE) — 8-SCENARIO VERIFICATION HARNESS      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Check health
try {
    $health = Invoke-RestMethod "$API_BASE/health"
    Write-Host "[API Health] Status: $($health.status) | Version: $($health.version)" -ForegroundColor Green
} catch {
    Write-Error "API server at $API_BASE is unreachable. Please ensure 'npm run dev' is running."
    exit 1
}

# 2. Define the 8 Scenarios + Expected Outcomes
$scenarios = @(
    @{
        Id = "M01_RENAME_TARGET"
        Name = "1. Rename Checkout Button Locator"
        Category = "UI Drift"
        Expected = "HEALED" # Or REVIEW_REQUIRED if similarity threshold is high
        Acceptable = @("HEALED", "REVIEW_REQUIRED")
        Description = "ID changed to #place-order-action, label changed to 'Place order'"
    },
    @{
        Id = "M02_RESTRUCTURE_DOM"
        Name = "2. Restructure DOM Hierarchy"
        Category = "UI Drift"
        Expected = "HEALED"
        Acceptable = @("HEALED")
        Description = "Wrapped in nested divs, ID is #checkout-action-restructured"
    },
    @{
        Id = "M03_MOVE_TARGET"
        Name = "3. Relocate Checkout Button"
        Category = "UI Drift"
        Expected = "HEALED"
        Acceptable = @("HEALED")
        Description = "Relocated to separate fast routing card, ID #checkout-relocated"
    },
    @{
        Id = "M04_ADD_REVIEW_STEP"
        Name = "4. Inject Intermediate Review Step"
        Category = "Workflow Drift"
        Expected = "REVIEW_REQUIRED"
        Acceptable = @("REVIEW_REQUIRED")
        Description = "Navigates to unexpected /checkout/review instead of checkout form"
    },
    @{
        Id = "M05_DUPLICATE_LABEL"
        Name = "5. Ambiguous Duplicate Action Labels"
        Category = "Ambiguity Drift"
        Expected = "REVIEW_REQUIRED"
        Acceptable = @("REVIEW_REQUIRED")
        Description = "Two conflicting 'Place order' buttons with duplicate labels"
    },
    @{
        Id = "M06_WRONG_TOTAL"
        Name = "6. Seeded Price Inflation Regression"
        Category = "Real Bug"
        Expected = "FAILED"
        Acceptable = @("FAILED")
        Description = "Cart total charges `$64 instead of `$54; oracle assertion fails"
    },
    @{
        Id = "M07_PAYMENT_ERROR"
        Name = "7. Mock Payment Gateway Failure"
        Category = "Real Bug"
        Expected = "FAILED"
        Acceptable = @("FAILED")
        Description = "Payment gateway returns declined; paymentStatus match fails"
    },
    @{
        Id = "M08_SERVER_UNAVAILABLE"
        Name = "8. Force 503 Service Unavailable"
        Category = "Infrastructure Bug"
        Expected = "FAILED"
        Acceptable = @("FAILED")
        Description = "Server throws 503 Service Unavailable; network error classified"
    }
)

$results = @()

foreach ($sc in $scenarios) {
    Write-Host ""
    Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Executing Scenario: $($sc.Name)" -ForegroundColor Yellow
    Write-Host "Type: $($sc.Category) | Expected Outcome: $($sc.Expected)" -ForegroundColor Gray

    # Reset fixtures in demo app
    try {
        Invoke-RestMethod -Uri "$DEMO_BASE/fixtures/reset" -Method Post | Out-Null
    } catch {}

    # Queue test run
    $payload = @{
        testId = "checkout-valid-card"
        contractVersion = 1
        mutationScenarioId = $sc.Id
        idempotencyKey = "verify_$(Get-Random)"
    } | ConvertTo-Json

    $createRes = Invoke-RestMethod -Uri "$API_BASE/runs" -Method Post -Body $payload -ContentType "application/json"
    $runId = $createRes.runId
    Write-Host "Queued Run ID: $runId" -ForegroundColor DarkCyan

    # Poll until terminal
    $runDetail = $null
    $maxAttempts = 35
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        Start-Sleep -Milliseconds 1200
        $runDetail = Invoke-RestMethod -Uri "$API_BASE/runs/$runId"
        $status = $runDetail.run.status
        if ($terminalStatuses -contains $status) {
            break
        }
        Write-Host -NoNewline "."
    }
    Write-Host ""

    $finalStatus = $runDetail.run.status
    $durMs = $runDetail.run.duration_ms
    $stepCount = $runDetail.steps.Count
    $eventCount = $runDetail.events.Count
    $artifactCount = $runDetail.artifacts.Count
    $recCount = $runDetail.recoveryAttempts.Count
    $summary = $runDetail.run.final_summary

    $passedCheck = $sc.Acceptable -contains $finalStatus
    $statusColor = if ($passedCheck) { "Green" } else { "Red" }

    Write-Host "  -> Actual Status: $finalStatus (Expected: $($sc.Expected))" -ForegroundColor $statusColor
    Write-Host "  -> Duration: ${durMs}ms | Steps: $stepCount | Events: $eventCount | Artifacts: $artifactCount"
    if ($summary) {
        Write-Host "  -> Summary: $summary" -ForegroundColor DarkGray
    }

    $results += [PSCustomObject]@{
        Id = $sc.Id
        Name = $sc.Name
        Category = $sc.Category
        Expected = $sc.Expected
        Actual = $finalStatus
        Verified = if ($passedCheck) { "PASS" } else { "FAIL" }
        DurationMs = $durMs
        Steps = $stepCount
        Events = $eventCount
        Artifacts = $artifactCount
    }
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "               FINAL 8-SCENARIO VERIFICATION MATRIX              " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
$results | Format-Table -Property Id, Category, Expected, Actual, Verified, DurationMs, Steps, Events, Artifacts -AutoSize

$allPass = ($results | Where-Object { $_.Verified -eq "FAIL" }).Count -eq 0
if ($allPass) {
    Write-Host "ALL 8 SCENARIOS MATCH SYSTEM INVARIANTS AND SPECIFICATIONS GENUINELY!" -ForegroundColor Green
} else {
    Write-Host "SOME SCENARIOS DID NOT MATCH EXPECTED OUTCOMES." -ForegroundColor Red
}
