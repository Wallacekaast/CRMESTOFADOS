#!/bin/bash

# Leão Estofados - Auto Installer
# Este script prepara uma VPS Ubuntu limpa e instala o sistema.

set -e # Para o script se houver erro

echo "🚀 Iniciando instalação do Sistema Leão Estofados..."

# 1. Atualizar sistema e instalar dependências básicas
echo "📦 Atualizando pacotes do sistema..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl

# 2. Instalar Docker se não estiver instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo "✅ Docker já está instalado."
fi

# 3. Configurar diretório do projeto
APP_DIR="app"
REPO_URL="https://github.com/Wallacekaast/CRMESTOFADOS.git"

if [ -d "$APP_DIR" ]; then
    echo "📂 Pasta '$APP_DIR' já existe. Atualizando código..."
    cd "$APP_DIR"
    git pull
else
    echo "📥 Clonando repositório..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Construir e Rodar
echo "🏗️ Construindo imagem do sistema (pode demorar alguns minutos)..."
sudo docker build -t sistema-leao .

# Parar container antigo se existir
if [ "$(sudo docker ps -aq -f name=sistema)" ]; then
    echo "🛑 Removendo versão anterior..."
    sudo docker stop sistema || true
    sudo docker rm sistema || true
fi

echo "🚀 Iniciando novo container..."
sudo docker run -d \
  --name sistema \
  --restart always \
  -p 80:3001 \
  -v "$(pwd)/data:/app/data" \
  sistema-leao

# 5. Finalização
IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo ""
echo "✅ Instalação concluída com sucesso!"
echo "--------------------------------------------------"
echo "🌍 O sistema deve estar acessível em: http://$IP"
echo "--------------------------------------------------"
