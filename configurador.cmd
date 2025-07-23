@echo off
setlocal enabledelayedexpansion

:: ========================================
:: CONFIGURADOR AUTOMATICO - DISPARADOR PRO V2
:: Configura webhooks nos arquivos main.js e relatorio.js
:: ========================================

title Configurador Disparador PRO V2
color 0a

echo.
echo ==============================================================
echo                    DISPARADOR PRO V2                         
echo                 CONFIGURADOR DE WEBHOOKS                     
echo ==============================================================
echo.

:: Verificar se os arquivos existem
echo Verificando arquivos na pasta atual...
dir *.js /b

:: Verificar main.js com diferentes possibilidades
set MAIN_FILE=
if exist "main.js" set MAIN_FILE=main.js
if exist "mainjs" set MAIN_FILE=mainjs
if exist "main.JS" set MAIN_FILE=main.JS

if "!MAIN_FILE!"=="" (
    echo ERRO: Arquivo main.js nao encontrado!
    echo.
    echo Arquivos .js encontrados na pasta:
    dir *.js /b
    echo.
    echo    Certifique-se de que existe um arquivo main.js na pasta
    echo    Ou renomeie o arquivo correto para main.js
    pause
    exit /b 1
)

:: Verificar relatorio.js com diferentes possibilidades  
set RELATORIO_FILE=
if exist "relatorio.js" set RELATORIO_FILE=relatorio.js
if exist "relatorioj" set RELATORIO_FILE=relatorioj
if exist "relatorio.JS" set RELATORIO_FILE=relatorio.JS

if "!RELATORIO_FILE!"=="" (
    echo ERRO: Arquivo relatorio.js nao encontrado!
    echo.
    echo Arquivos .js encontrados na pasta:
    dir *.js /b
    echo.
    echo    Certifique-se de que existe um arquivo relatorio.js na pasta
    echo    Ou renomeie o arquivo correto para relatorio.js
    pause
    exit /b 1
)

echo Arquivos encontrados: 
echo    Main: !MAIN_FILE!
echo    Relatorio: !RELATORIO_FILE!
echo.

:: Fazer backup dos arquivos originais
echo Criando backup dos arquivos originais...
if not exist "backup" mkdir backup
copy /y "!MAIN_FILE!" "backup\!MAIN_FILE!.bak" >nul 2>&1
copy /y "!RELATORIO_FILE!" "backup\!RELATORIO_FILE!.bak" >nul 2>&1
echo Backup criado na pasta 'backup\'
echo.

::   CONFIGURACAO DOS WEBHOOKS
echo ----------------------------------------------------------------
echo.

:: Webhook Principal (Disparo)
:input_webhook_principal
echo WEBHOOK PRINCIPAL (Disparo de mensagens):
echo    Exemplo: https://seu-n8n.com/webhook/disparador
set /p webhook_principal="   Digite a URL: "
if "!webhook_principal!"=="" (
    echo URL nao pode estar vazia!
    goto input_webhook_principal
)

:: Webhook Conexao
:input_webhook_conexao
echo.
echo WEBHOOK DE CONEXAO (Verificar status):
echo    Exemplo: https://seu-n8n.com/webhook/verificar-conexao
set /p webhook_conexao="   Digite a URL: "
if "!webhook_conexao!"=="" (
    echo URL nao pode estar vazia!
    goto input_webhook_conexao
)

:: Webhook Email
:input_webhook_email
echo.
echo WEBHOOK DE EMAIL (Envio de relatorios):
echo    Exemplo: https://seu-n8n.com/webhook/enviar-email
set /p webhook_email="   Digite a URL: "
if "!webhook_email!"=="" (
    echo URL nao pode estar vazia!
    goto input_webhook_email
)

echo.
echo ----------------------------------------------------------------
echo RESUMO DAS CONFIGURACOES:
echo ----------------------------------------------------------------
echo Webhook Principal: !webhook_principal!
echo Webhook Conexao:   !webhook_conexao!
echo Webhook Email:     !webhook_email!
echo ----------------------------------------------------------------
echo.

set /p confirma="Confirma as configuracoes? (S/N): "
if /i not "!confirma!"=="S" if /i not "!confirma!"=="SIM" (
    echo Configuracao cancelada pelo usuario.
    pause
    exit /b 0
)

echo.
echo APLICANDO CONFIGURACOES...
echo.

:: Configurar main.js
echo Configurando !MAIN_FILE!...

:: Criar script PowerShell mais eficiente
echo # Configurar main.js com substituicao direta > temp_config.ps1
echo $content = Get-Content '!MAIN_FILE!' -Raw -Encoding UTF8 >> temp_config.ps1
echo. >> temp_config.ps1
echo # URLs antigas a serem substituidas >> temp_config.ps1
echo $oldWebhookUrl = "https://webhook.seudominio.com.br/webhook/disparadorProV2" >> temp_config.ps1
echo $oldWebhookConexao = "https://webhook.seudominio.com.br/webhook/verificarConexao" >> temp_config.ps1
echo. >> temp_config.ps1
echo # URLs novas >> temp_config.ps1
echo $newWebhookUrl = "!webhook_principal!" >> temp_config.ps1
echo $newWebhookConexao = "!webhook_conexao!" >> temp_config.ps1
echo. >> temp_config.ps1
echo # Substituir URLs >> temp_config.ps1
echo $content = $content.Replace($oldWebhookUrl, $newWebhookUrl) >> temp_config.ps1
echo $content = $content.Replace($oldWebhookConexao, $newWebhookConexao) >> temp_config.ps1
echo. >> temp_config.ps1
echo # Adicionar comentario no inicio >> temp_config.ps1
echo $timestamp = Get-Date -Format 'dd/MM/yyyy HH:mm:ss' >> temp_config.ps1
echo $configComment = "// CONFIGURADO AUTOMATICAMENTE - " + $timestamp + "`n// Webhook Principal: !webhook_principal!`n// Webhook Conexao: !webhook_conexao!`n`n" >> temp_config.ps1
echo $content = $configComment + $content >> temp_config.ps1
echo. >> temp_config.ps1
echo # Salvar arquivo >> temp_config.ps1
echo [System.IO.File]::WriteAllText('!MAIN_FILE!', $content, [System.Text.Encoding]::UTF8) >> temp_config.ps1

powershell -ExecutionPolicy Bypass -File temp_config.ps1

if %errorlevel% equ 0 (
    echo !MAIN_FILE! configurado com sucesso!
) else (
    echo Erro ao configurar !MAIN_FILE!
)

:: Configurar relatorio.js
echo Configurando !RELATORIO_FILE!...

:: Criar script PowerShell para relatorio.js
echo # Configurar relatorio.js > temp_relatorio.ps1
echo $content = Get-Content '!RELATORIO_FILE!' -Raw -Encoding UTF8 >> temp_relatorio.ps1
echo. >> temp_relatorio.ps1
echo # Substituir URL do webhook de email >> temp_relatorio.ps1
echo $oldUrl = "https://webhook.seudominio.com.br/webhook/enviarEmail" >> temp_relatorio.ps1
echo $newUrl = "!webhook_email!" >> temp_relatorio.ps1
echo $content = $content.Replace($oldUrl, $newUrl) >> temp_relatorio.ps1
echo. >> temp_relatorio.ps1
echo # Adicionar comentario >> temp_relatorio.ps1
echo $timestamp = Get-Date -Format 'dd/MM/yyyy HH:mm:ss' >> temp_relatorio.ps1
echo $configComment = "// CONFIGURADO AUTOMATICAMENTE - " + $timestamp + "`n// Webhook Email: !webhook_email!`n`n" >> temp_relatorio.ps1
echo $content = $configComment + $content >> temp_relatorio.ps1
echo. >> temp_relatorio.ps1
echo # Salvar arquivo >> temp_relatorio.ps1
echo [System.IO.File]::WriteAllText('!RELATORIO_FILE!', $content, [System.Text.Encoding]::UTF8) >> temp_relatorio.ps1

powershell -ExecutionPolicy Bypass -File temp_relatorio.ps1

if %errorlevel% equ 0 (
    echo !RELATORIO_FILE! configurado com sucesso!
) else (
    echo Erro ao configurar !RELATORIO_FILE!
)

:: Limpar arquivos temporarios
del temp_config.ps1 >nul 2>&1
del temp_relatorio.ps1 >nul 2>&1

echo.
echo ==============================================================
echo                   CONFIGURACAO CONCLUIDA!                 
echo ==============================================================
echo.
echo Arquivos configurados:
echo    main.js     - Webhooks de disparo e conexao aplicados
echo    relatorio.js - Webhook de email aplicado
echo.
echo Backup dos arquivos originais salvo em: backup\
echo.
echo O Disparador PRO V2 esta pronto para uso!
echo    Abra o arquivo index.html para comecar.
echo.

:: Perguntar se quer abrir o Disparador
set /p abrir="Deseja abrir o Disparador PRO agora? (S/N): "
if /i "!abrir!"=="S" (
    if exist "index.html" (
        start "" "index.html"
        echo Disparador PRO aberto no navegador!
    ) else (
        echo Arquivo index.html nao encontrado
    )
)

echo.
echo DICAS:
echo    Se algo nao funcionar, restaure os backups da pasta 'backup\'
echo    Use Ctrl+F5 no navegador para limpar cache
echo    Verifique se as URLs dos webhooks estao corretas
echo.

pause