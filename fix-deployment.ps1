# Deployment Fixes - Run in PowerShell as Administrator
# ======================================================
# This script fixes the root causes of deployment failures:
# 1. Updates OIDC provider with current GitHub thumbprint
# 2. Adds CloudWatch Logs permissions to ECS task execution role
# 2. Triggers new deployment

# ======================================================
# CONFIGURATION - Verify these values
# ======================================================
$AccountId = "013659367345"
$Region = "ap-south-1"
$OIDCProviderArn = "arn:aws:iam::$AccountId:oidc-provider/token.actions.githubusercontent.com"
$RoleName = "ecsTaskExecutionRole"
$LogGroup = "/ecs/rahatsetu-backend"

Write-Host "=== Deployment Fixes Script ===" -ForegroundColor Green
Write-Host "Account: $AccountId" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# ======================================================
# STEP 1: Update OIDC Provider with Current GitHub Thumbprint
# ======================================================
Write-Host "=== STEP 1: Updating OIDC Provider Thumbprint ===" -ForegroundColor Yellow

try {
    # Get current thumbprint from GitHub's JWKS endpoint
    Write-Host "Fetching current thumbprint from GitHub..." -ForegroundColor Cyan
    $jwks = Invoke-WebRequest -Uri "https://token.actions.githubusercontent.com/.well-known/jwks.json" -UseBasicParsing | ConvertFrom-Json
    $certB64 = $jwks.keys[0].x5c[0]
    $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new([Convert]::FromBase64String($certB64))
    $thumbprint = $cert.GetCertHashString("SHA1")
    Write-Host "Current thumbprint: $thumbprint" -ForegroundColor Green
    
    # Delete old provider
    Write-Host "Deleting old OIDC provider..." -ForegroundColor Cyan
    aws iam delete-open-id-connect-provider --open-id-connect-provider-arn $OIDCProviderArn 2>$null
    Write-Host "Old provider deleted" -ForegroundColor Green
    
    # Create new provider with current thumbprint
    Write-Host "Creating new OIDC provider with thumbprint: $thumbprint" -ForegroundColor Cyan
    $result = aws iam create-open-id-connect-provider `
      --url https://token.actions.githubusercontent.com `
      --client-id-list sts.amazonaws.com `
      --thumbprint-list $thumbprint
    Write-Host "OIDC provider created: $result" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to update OIDC provider: $_"
    exit 1
}

Write-Host ""

# ======================================================
# STEP 2: Add CloudWatch Logs Permissions to ECS Task Execution Role
# ======================================================
Write-Host "=== STEP 2: Adding CloudWatch Logs Permissions ===" -ForegroundColor Yellow

$policyDoc = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:CreateLogGroup"
      ],
      "Resource": "arn:aws:logs:ap-south-1:013659367345:log-group:/ecs/rahatsetu-backend:*"
    }
  ]
}
'@

try {
    Write-Host "Adding CloudWatch Logs permissions to ecsTaskExecutionRole..." -ForegroundColor Cyan
    $policyJson = $policyDoc | ConvertTo-Json -Depth 10 -Compress
    $policyFile = "$env:TEMP\logs-policy.json"
    $policyJson | Out-File -FilePath $policyFile -Encoding ascii
    
    aws iam put-role-policy --role-name ecsTaskExecutionRole --policy-name CloudWatchLogsAccess --policy-document file://$policyFile
    Write-Host "CloudWatch Logs permissions added to ecsTaskExecutionRole" -ForegroundColor Green
} catch {
    Write-Error "Failed to add CloudWatch Logs permissions: $_"
    exit 1
}

Write-Host ""

# ======================================================
# STEP 3: Verify Changes
# ======================================================
Write-Host "=== STEP 3: Verifying Changes ===" -ForegroundColor Yellow

Write-Host "Verifying OIDC provider..." -ForegroundColor Cyan
aws iam get-open-id-connect-provider --open-id-connect-provider-arn arn:aws:iam::013659367345:oidc-provider/token.actions.githubusercontent.com

Write-Host ""
Write-Host "Verifying role policy..." -ForegroundColor Cyan
aws iam get-role-policy --role-name ecsTaskExecutionRole --policy-name CloudWatchLogsAccess

Write-Host ""
Write-Host "=== ALL FIXES APPLIED SUCCESSFULLY ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Push a commit to trigger deployment" -ForegroundColor Cyan
Write-Host "Run: git commit --allow-empty -m 'fix: deployment fixes' && git push origin main --force" -ForegroundColor Cyan