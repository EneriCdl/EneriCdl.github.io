param(
  [string]$Message = "chore: update articles"
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

git add articles.json

if (git diff --cached --quiet) {
  Write-Output 'articles.json 无变更，已取消发布。'
  exit 0
}

git commit -m $Message
git push

Write-Output '发布完成。请等待 1-2 分钟后刷新网站。'
