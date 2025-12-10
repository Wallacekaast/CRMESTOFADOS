@echo off
setlocal
cd /d "%~dp0"
echo [Start] Verificando dependencias...
IF NOT EXIST "node_modules" (
  echo Instalando dependencias...
  call npm.cmd install --include=dev
)
call npm.cmd install --include=dev
call npm.cmd rebuild esbuild
echo Iniciando API local...
start "" /b node "server\index.mjs"
) IF EXIST "node_modules\.bin\vite.cmd" (
  echo Iniciando servidor de desenvolvimento ^(Vite^)...
  call "node_modules\.bin\vite.cmd"
) ELSE (
  echo Vite nao encontrado. Tentando via npm run dev...
  call npm.cmd run dev
)
endlocal
