# Expõe o painel (rodando no Docker dentro do WSL2) pra outras máquinas da
# rede da empresa conseguirem acessar via http://172.24.4.12:8081.
#
# Precisa rodar de novo TODA VEZ que:
#   - reiniciar o Windows, ou
#   - reiniciar o WSL2 (`wsl --shutdown`), ou
#   - o Docker Desktop/containers subirem de novo depois de um desses.
# Isso porque o IP interno do WSL2 muda a cada reinício — o script já busca
# o IP atual sozinho, então é só rodar de novo, sem precisar descobrir nada.
#
# Como rodar: abrir o PowerShell COMO ADMINISTRADOR (botão direito no ícone
# do PowerShell > "Executar como administrador"), navegar até essa pasta e
# rodar:
#   .\expor-na-rede.ps1

$ErrorActionPreference = 'Stop'

$porta = 8081
$ipWindowsNaRede = '172.24.4.12'  # ajustar aqui se o IP do ipconfig mudar

Write-Host "Descobrindo o IP atual do WSL2..."
$ipWsl = (wsl hostname -I).Trim().Split(' ')[0]
if (-not $ipWsl) {
    throw "Não consegui descobrir o IP do WSL2 — ele está rodando? Teste 'wsl hostname -I' manualmente."
}
Write-Host "WSL2 está em: $ipWsl"

Write-Host "Removendo regra de encaminhamento antiga (se existir)..."
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$porta 2>$null | Out-Null

Write-Host "Criando encaminhamento: 0.0.0.0:$porta -> $ipWsl`:$porta ..."
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$porta connectaddress=$ipWsl connectport=$porta

Write-Host "Liberando no Windows Firewall (se a regra ainda não existir)..."
$regraExiste = Get-NetFirewallRule -DisplayName "Painel PDV C5 SN ($porta)" -ErrorAction SilentlyContinue
if (-not $regraExiste) {
    New-NetFirewallRule -DisplayName "Painel PDV C5 SN ($porta)" -Direction Inbound -LocalPort $porta -Protocol TCP -Action Allow | Out-Null
    Write-Host "Regra de firewall criada."
} else {
    Write-Host "Regra de firewall já existia, nada a fazer."
}

Write-Host ""
Write-Host "Pronto! Quem estiver na mesma rede já pode acessar:"
Write-Host "  http://$ipWindowsNaRede`:$porta"
Write-Host ""
Write-Host "Conferir o encaminhamento a qualquer momento com:"
Write-Host "  netsh interface portproxy show v4tov4"
