$base = "http://localhost:3001/api"
$d = Get-Date
$d = $d.AddDays(2)
$d = Get-Date -Year $d.Year -Month $d.Month -Day $d.Day -Hour 14 -Minute 0 -Second 0
$slotStart = $d.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$d2 = $d.AddHours(2)
$slotEnd = $d2.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host "=== Test 1: Different benches same slot"
Write-Host "Slot: $slotStart - $slotEnd"

$b1 = Invoke-RestMethod -Uri "$base/benches/bench_001" -Method Get
$b2 = Invoke-RestMethod -Uri "$base/benches/bench_002" -Method Get
Write-Host "Bench1: $($b1.data.name)"
Write-Host "Bench2: $($b2.data.name)"

$body1 = @{
  benchId = "bench_001"
  startTime = $slotStart
  endTime = $slotEnd
  projectName = "Project-A"
  description = "Conflict test bench1"
  participants = @("zhang")
} | ConvertTo-Json -Depth 3
$r1 = Invoke-RestMethod -Uri "$base/reservations" -Method Post -Body $body1 -ContentType "application/json"
Write-Host "R1 success=$($r1.success) id=$($r1.data.id) err=$($r1.error)"

$body2 = @{
  benchId = "bench_002"
  startTime = $slotStart
  endTime = $slotEnd
  projectName = "Project-B"
  description = "Conflict test bench2"
  participants = @("li")
} | ConvertTo-Json -Depth 3
$r2 = Invoke-RestMethod -Uri "$base/reservations" -Method Post -Body $body2 -ContentType "application/json"
Write-Host "R2 success=$($r2.success) id=$($r2.data.id) err=$($r2.error)"

Write-Host ""
Write-Host "=== Test 2: Same bench same slot (should conflict)"
$body3 = @{
  benchId = "bench_001"
  startTime = $slotStart
  endTime = $slotEnd
  projectName = "Project-Conflict"
  description = "Conflict test same bench"
  participants = @("wang")
} | ConvertTo-Json -Depth 3
$r3 = Invoke-RestMethod -Uri "$base/reservations" -Method Post -Body $body3 -ContentType "application/json"
Write-Host "R3 success=$($r3.success) id=$($r3.data.id) err=$($r3.error)"

Write-Host ""
Write-Host "=== Test 3: Approval with reservation info"
$approvals = Invoke-RestMethod -Uri "$base/approvals/pending" -Method Get
Write-Host "Pending count=$($approvals.data.Count)"
if ($approvals.data.Count -gt 0) {
    $first = $approvals.data[0]
    Write-Host "First approval id=$($first.id)"
    $hasRes = $first.reservation -ne $null
    Write-Host "Has reservation field: $hasRes"
    if ($hasRes) {
        Write-Host "  userName=$($first.reservation.userName)"
        Write-Host "  projectName=$($first.reservation.projectName)"
        Write-Host "  benchName=$($first.reservation.benchName)"
        Write-Host "  startTime=$($first.reservation.startTime)"
        Write-Host "  endTime=$($first.reservation.endTime)"
        Write-Host "  description=$($first.reservation.description)"
    }
}

Write-Host ""
Write-Host "=== Test 4: auto_system auto-decide"
if ($approvals.data.Count -gt 0) {
    $testApproval = $approvals.data[0]
    Write-Host "Testing approval id=$($testApproval.id) approver=$($testApproval.approverId)"
    $autoBody = @{
        approverId = "auto_system"
        comment = "Auto approved test"
    } | ConvertTo-Json -Depth 3
    $autoRes = Invoke-RestMethod -Uri "$base/approvals/$($testApproval.id)/approve" -Method Post -Body $autoBody -ContentType "application/json"
    Write-Host "Auto approve success=$($autoRes.success) err=$($autoRes.error)"
    if ($autoRes.data) {
        Write-Host "  node status=$($autoRes.data.status) role=$($autoRes.data.role)"
    }
    $resAfter = Invoke-RestMethod -Uri "$base/reservations/$($testApproval.reservationId)" -Method Get
    Write-Host "  reservation status=$($resAfter.data.status)"
}
