# 🚀 Guia de Instalação em VPS Linux (Docker)

Este guia descreve o passo a passo para colocar o sistema **Leão Estofados** online em uma VPS Linux (Ubuntu 20.04/22.04/24.04) utilizando **Docker**.

Esta é a forma mais segura e robusta de hospedar o sistema, garantindo que o banco de dados (SQLite) e os arquivos de upload sejam preservados.

---

## 📋 Pré-requisitos

1.  Uma **VPS** (Servidor Virtual Privado) com acesso root.
    *   Recomendados: Hetzner, DigitalOcean, AWS Lightsail, Vultr.
    *   Configuração mínima: 1 vCPU, 1GB RAM (2GB recomendado).
2.  Um domínio (opcional, mas recomendado para acesso HTTPS).

---

## 🛠️ Passo 1: Acessar a VPS

Abra o terminal do seu computador (PowerShell no Windows ou Terminal no Mac/Linux) e conecte-se via SSH:

```bash
ssh root@SEU_IP_DA_VPS
# Exemplo: ssh root@192.168.1.100
```

---

## 🐳 Passo 2: Instalar o Docker

Execute os comandos abaixo para instalar o Docker no Ubuntu:

```bash
# 1. Atualizar lista de pacotes
sudo apt update && sudo apt upgrade -y

# 2. Instalar script oficial de instalação do Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Verificar se o Docker está rodando
sudo systemctl status docker
# (Aperte 'q' para sair da tela de status)
```

---

## 📥 Passo 3: Baixar o Projeto

Você vai clonar o repositório do GitHub diretamente na VPS.

```bash
# 1. Instalar git (caso não tenha)
sudo apt install git -y

# 2. Clonar o repositório
# Substitua pela URL do seu repositório
git clone https://github.com/Wallacekaast/CRMESTOFADOS.git app

# 3. Entrar na pasta
cd app
```

---

## 🏗️ Passo 4: Configurar e Rodar o Sistema

Agora vamos usar o Docker para "empacotar" e rodar o sistema.

### 1. Construir a Imagem (Build)

```bash
# Isso pode levar alguns minutos
docker build -t sistema-leao .
```

### 2. Rodar o Container (Deploy)

Este comando inicia o sistema e configura a persistência de dados (para não perder o banco de dados ao reiniciar).

```bash
docker run -d \
  --name sistema \
  --restart always \
  -p 80:3001 \
  -v $(pwd)/data:/app/data \
  sistema-leao
```

**Explicação do comando:**
*   `-d`: Roda em segundo plano (background).
*   `--name sistema`: Nomeia o container como "sistema".
*   `--restart always`: Reinicia o sistema automaticamente se o servidor reiniciar ou cair.
*   `-p 80:3001`: Redireciona a porta 80 (web padrão) para a porta 3001 do sistema.
*   `-v $(pwd)/data:/app/data`: **IMPORTANTE!** Cria um vínculo entre a pasta `data` do servidor e o container. Isso garante que o arquivo `app.db` (banco de dados) e uploads sejam salvos no disco do servidor.

---

## ✅ Passo 5: Testar

Abra seu navegador e acesse o IP da sua VPS:

`http://SEU_IP_DA_VPS`

O sistema deve carregar normalmente.

---

## 🔄 Como Atualizar o Sistema

Quando você fizer alterações no código e subir para o GitHub, siga estes passos para atualizar na VPS:

1.  Acesse a VPS via SSH.
2.  Entre na pasta: `cd app`
3.  Baixe as atualizações:
    ```bash
    git pull
    ```
4.  Reconstrua a imagem:
    ```bash
    docker build -t sistema-leao .
    ```
5.  Pare e remova o container antigo:
    ```bash
    docker stop sistema
    docker rm sistema
    ```
6.  Rode o novo container:
    ```bash
    docker run -d \
      --name sistema \
      --restart always \
      -p 80:3001 \
      -v $(pwd)/data:/app/data \
      sistema-leao
    ```

---

## 🔒 Passo Extra: Configurar Domínio e HTTPS (SSL)

Para ter um cadeado seguro (HTTPS) e usar um domínio (ex: `sistema.suaempresa.com`), a forma mais fácil é usar o **Caddy**.

1.  Instale o Caddy na VPS (consulte a doc oficial ou use Docker Compose).
2.  Ou, de forma simplificada, aponte o DNS do seu domínio (Tipo A) para o IP da VPS.

Se precisar de configuração avançada de SSL, consulte sobre "Reverse Proxy com Nginx ou Caddy".
