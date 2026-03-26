# Deploy via Portainer Stack (Docker Swarm Mode)

Este projeto utiliza **Integração Contínua (CI/CD)** através do Github Actions. Isso significa que você **NÃO** precisa acessar o terminal da sua VPS para compilar a imagem. O GitHub faz isso automaticamente e publica no `ghcr.io` (GitHub Container Registry).

## 1. Como fazer o Deploy no Portainer (Atualizado para Swarm e N8N)
Vá em `Stacks > Add Stack` no seu Portainer.
Selecione **Web editor** ou **Repository** (apontando para o seu Github).
Cole o conteúdo do arquivo `docker-compose.yml` que está configurado para puxar a imagem `ghcr.io/fontesmidias/greenhouse-beneficios:latest`.

## 2. Variáveis de Ambiente (Environment variables)
No Portainer, adicione as seguintes variáveis na seção de env vars:

```env
DOMAIN=beneficios.unibot.com.br

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=SEU_EMAIL_AQUI
SMTP_PASS=SUA_SENHA_DE_APP_AQUI

EVO_SERVER_URL=https://evo.unibot.com.br
EVO_GLOBAL_KEY=SUA_GLOBAL_KEY_AQUI
EVO_INSTANCE_NAME=SUA_INSTANCIA_AQUI
```

## 3. Segurança e Labels Traefik
As labels do Traefik agora estão 100% amarradas dentro da chave `deploy` (exigência do Swarm).
A rede também está especificada rigorosamente como `unibotnet`. Não é mais necessário alterar o nome da rede, pois ele já combina com o cluster do seu N8N.

## 4. Deploy Final
Clique em **Deploy the Stack**.
> O Portainer vai fazer o download automático da imagem compilada pelo GitHub Actions (`ghcr.io/...`). Os diretórios de Banco de Dados local e Uploads de Planilhas permanecerão persistidos nos volumes `greenhouse_data` e `greenhouse_uploads`. Seu app iniciará em instantes.
