$file = "e:\College\TPO_Website\frontend\src\index.css"
$lines = Get-Content $file
Write-Host "Total lines: $($lines.Count)"

# Show lines 628-632
Write-Host "=== Lines 628-632 ==="
for ($i = 627; $i -le 631; $i++) { Write-Host "${i}: $($lines[$i])" }

Write-Host "=== Lines 984-990 ==="
for ($i = 983; $i -le 990; $i++) { Write-Host "${i}: $($lines[$i])" }

# Remove lines 629 to 985 (0-indexed: 628 to 984) - the giant duplicate block
# Keep lines 0..627 and 985..end
$keep = @($lines[0..627]) + @($lines[985..($lines.Count - 1)])
Set-Content $file -Value $keep -Encoding UTF8
Write-Host "Done. New line count: $($keep.Count)"
