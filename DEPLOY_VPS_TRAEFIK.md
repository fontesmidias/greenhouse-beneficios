# Deploy via Portainer Stack (Docker)

Para realizar o deploy 100% isolado e seguro na sua VPS usando Portainer, sem expor subdomínios ou chaves no repositório:

## 1. Criar a Stack no Portainer
Vá em `Stacks > Add Stack` no seu Portainer.
Selecione **Web editor** ou **Repository** (apontando para o seu Github).
Cole o conteúdo do arquivo `docker-compose.yml` raiz.

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

## 3. A Rede do Traefik
No `docker-compose.yml`, o app assina a rede externa `traefik-public`.
Se o seu Traefik na VPS usa um nome diferente de rede (ex: `web`, `traefik_net`, `proxy`, ou a default do n8n), você **DEVE** editar a stack e substituir `traefik-public` pelo nome exato da rede do Traefik.

## 4. Deploy
Clique em **Deploy the Stack**.
> O Docker montará silenciosamente os diretórios `/app/uploads` e `/app/data` no host docker via volumes `greenhouse_data` e `greenhouse_uploads`. Sua base será persistente.

Nenhuma porta pública foi exposta (apenas o hostname dinâmico do Traefik). Segurança máxima.
