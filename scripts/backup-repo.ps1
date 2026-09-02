$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$branch = git rev-parse --abbrev-ref HEAD

Write-Host "Verificando status do repositório..."
git status --short

Write-Host "Adicionando alterações..."
git add .

Write-Host "Criando backup local..."
git commit -m "Backup: $timestamp" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

Write-Host "Enviando para o remoto..."
git push origin $branch

Write-Host "Backup concluído."
