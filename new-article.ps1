param(
  [switch]$Publish
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$articlesPath = Join-Path $PSScriptRoot 'articles.json'
if (-not (Test-Path $articlesPath)) {
  throw '未找到 articles.json'
}

function Read-Required([string]$prompt) {
  while ($true) {
    $value = Read-Host $prompt
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value.Trim()
    }
    Write-Host '该项不能为空，请重新输入。' -ForegroundColor Yellow
  }
}

function Read-Optional([string]$prompt, [string]$default = '') {
  $value = Read-Host $prompt
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $default
  }
  return $value.Trim()
}

$raw = Get-Content -Path $articlesPath -Raw -Encoding UTF8
$data = @()
if (-not [string]::IsNullOrWhiteSpace($raw)) {
  $parsed = $raw | ConvertFrom-Json
  if ($parsed -is [System.Collections.IEnumerable]) {
    $data = @($parsed)
  }
}

$title = Read-Required '标题'
$summary = Read-Required '摘要'
Write-Host '请输入正文（可多行）。输入 END 单独一行结束：'
$lines = New-Object System.Collections.Generic.List[string]
while ($true) {
  $line = Read-Host
  if ($line -eq 'END') { break }
  $lines.Add($line)
}
$content = ($lines -join [Environment]::NewLine).Trim()
if ([string]::IsNullOrWhiteSpace($content)) {
  throw '正文不能为空。'
}

$tagsInput = Read-Optional '标签（英文逗号分隔，如 C语言,STM32）'
$cover = Read-Optional '封面图链接（可留空）' 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80'
$date = Read-Optional '日期（YYYY-MM-DD，留空=今天）' (Get-Date -Format 'yyyy-MM-dd')
$status = Read-Optional '状态（published/draft，留空=published）' 'published'

if ($status -ne 'published' -and $status -ne 'draft') {
  throw '状态只能是 published 或 draft。'
}

$slug = ((Get-Date -Format 'yyyy-MM-dd') + '-' + ($title.ToLower() -replace '[^a-z0-9\u4e00-\u9fa5]+','-' -replace '-+','-').Trim('-'))
if ([string]::IsNullOrWhiteSpace($slug)) {
  $slug = 'post-' + (Get-Date -Format 'yyyyMMddHHmmss')
}

$article = [ordered]@{
  id = $slug
  title = $title
  summary = $summary
  content = $content
  cover = $cover
  tags = @()
  status = $status
  updatedAt = $date
}

if (-not [string]::IsNullOrWhiteSpace($tagsInput)) {
  $article.tags = @($tagsInput.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$data = @($article) + @($data | ForEach-Object { $_ })
$data | ConvertTo-Json -Depth 10 | Set-Content -Path $articlesPath -Encoding UTF8

Write-Host "已写入: $articlesPath" -ForegroundColor Green
Write-Host "文章 ID: $slug" -ForegroundColor Green

$wantPublish = $Publish.IsPresent
if (-not $wantPublish) {
  $inputPublish = Read-Optional '是否立刻发布到网站？(y/N)' 'N'
  if ($inputPublish -match '^(y|Y)$') {
    $wantPublish = $true
  }
}

if ($wantPublish) {
  & "$PSScriptRoot\publish-articles.ps1" -Message "feat: publish article $slug"
}
