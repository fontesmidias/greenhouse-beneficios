# Green House - Portal de Benefícios

Aplicação conteinerizada para gestão de recibos de VA/VT via WhatsApp (Evolution API).

## 1. Subindo o Repositório para o seu GitHub
O código criado já está pronto para o Git. Para enviar ao seu GitHub privado:
1. Crie um novo repositório vazio no GitHub (ex: `greenhouse-beneficios`).
2. Abra o terminal nesta pasta (`app-beneficios`) e rode:
   ```bash
   git add .
   git commit -m "feat: setup inicial do projeto com docker"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/greenhouse-beneficios.git
   git push -u origin main
   ```

## 2. Deploy no Portainer
O projeto está preparado para rodar no Portainer da sua infraestrutura.
Use o arquivo `docker-compose.yml` que criei nesta pasta.

**Passo a Passo (Portainer):**
1. Acesse seu Portainer e vá em **Stacks** -> **Add Stack**.
2. Dê o nome de `greenhouse-beneficios`.
3. Escolha **Web editor** e cole o conteúdo do arquivo `docker-compose.yml`.
4. (Opcional) Edite as *Environment variables* no final da página, colocando sua chave de API da Evolution.
5. Clique em **Deploy the stack**.

## 3. Configuração do Reverse Proxy (Traefik/Nginx)
Se você usa o Nginx Proxy Manager no mesmo servidor:
- Crie um novo *Proxy Host*.
- Domain: `beneficios.suaempresa.com.br`
- Forward Hostname/IP: o nome do container (`greenhouse-beneficios`) ou o IP da rede do Docker.
- Forward Port: `3000`.

---
## 4. Estrutura de Arquivos Iniciais
- `src/app/` -> Onde as telas Next.js vão morar
- `docker-compose.yml` -> Configuração Portainer
- `INSTRUCOES_DP_PORTAINER.md` -> Este guia
