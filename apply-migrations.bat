@echo off
setlocal
cd /d "%~dp0"
echo [Supabase] Aplicando migracoes...
where supabase >nul 2>&1
IF ERRORLEVEL 1 (
  echo Supabase CLI nao encontrado no PATH.
  echo Instale: npm i -g supabase ^| ou baixe o binario oficial.
  echo Depois execute: supabase db up
  exit /b 1
)
supabase db up
if ERRORLEVEL 1 (
  echo Falha ao aplicar migracoes.
  exit /b 1
)
echo Migracoes aplicadas com sucesso.
endlocal
