# Deploy na VPS com Traefik (Subdomínio: beneficios.unibot.com.br)

Para realizar o deploy seguro deste projeto Next.js em sua VPS (utilizando o Traefik Reverse-Proxy do N8N ou da Unibot), siga as instruções arquiteturais:

## 1. Transferência para a VPS
Selecione o diretório desejado na sua VPS e puxe do repositório:
```bash
git clone https://github.com/SEU-USUARIO/app-beneficios.git
cd app-beneficios
```

## 2. Configuração do Ambiente (.env)
Crie um arquivo `.env` na raiz do projeto contendo 100% das variáveis de produção (Não utilize as antigas locais):
```bash
nano .env
```
Cole os dados criptográficos da Evo e do Email:
```env
NEXT_PUBLIC_BASE_URL=https://beneficios.unibot.com.br

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=fontesmidias.online@gmail.com
SMTP_PASS=dnuzdtwuyawescni

EVO_SERVER_URL=https://evo.unibot.com.br
EVO_GLOBAL_KEY=67f26c18231990817f3c00635ce2d435
EVO_INSTANCE_NAME=pessoalbrunoevo
```

## 3. A Rede do Traefik (Atenção Máxima)
No `docker-compose.yml`, o app assina a rede externa `traefik-public`.
Se o seu Traefik na VPS usa um nome diferente de rede (ex: `web`, `traefik_net`, `proxy`, ou a default do n8n), você **DEVE** editar o `docker-compose.yml` e substituir `traefik-public` pelo nome exato que o seu container Traefik enxerga.

> **Segurança:** O mapeamento `ports: - "3000:3000"` foi totalmente extinto a seu pedido. Foi usado apenas `expose: - "3000"`. Isso significa que NINGUÉM na internet conseguirá burlar o seu domínio via acesso por IP:Porta direto, obrigando o SSL.

## 4. Subir a Produção
Feito isso, mande processar o build do portal inteiro:
```bash
docker-compose up -d --build
```
> O Docker montará silenciosamente os diretórios `/app/uploads` e `/app/data` para que toda a base de recibos em JSON e os PDFs fiquem persistentes numa reinicialização da VPS.

Se os PDFs futuramente falharem no disparo com erros na VPS, lembre-se das permissões Unix no diretório (como root):
```bash
chmod -R 777 data/ uploads/ prisma/
```
