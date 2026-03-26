# Deploy via Portainer Stack (Docker)

Para realizar o deploy 100% isolado e seguro na sua VPS usando Portainer, sem expor subdomínios ou chaves no repositório:

## 1. O Desafio do Portainer em Cluster (Swarm Mode)
Ao tentar colar a Stack no seu Portainer, ele barrou os comandos `build`, `container_name` e `expose` porque a sua instância do Portainer está operando como **Swarm** (Clusters Docker) e não como **Standalone**. Em Swarm, as regras são mais estritas:

**Como resolver a imagem (Build):**
O Swarm não constrói imagens na hora. Você precisará acessar o terminal da sua VPS (SSH) e rodar uma única vez:
`git clone [link do seu repositorio] && cd app-beneficios`
`docker build -t greenhouse-app:latest .`

Após isso, o Portainer achará a imagem `greenhouse-app:latest` armazenada localmente para rodar a Stack!

## 2. A Rede Externa (Traefik) - O Erro 'network not found'
A Stack tenta se plugar numa rede externa chamada `traefik-public`. O seu Portainer reclamou que "*network traefik-public could not be found*".
Isso ocorre porque **você precisa descobrir o nome exato da rede no qual o seu Traefik (ou N8N) está rodando**.

1. No seu Portainer, vá em **Networks**. Veja o nome da rede onde o Traefik está amarrado (Geralmente é `traefik`, `proxy`, `web`, ou `n8n_default`).
2. Adicionalmente, o Swarm exige que as redes externas sejam do tipo `overlay` (swarm-scoped).
3. Após achar o nome real, troque o valor `traefik-public` no final do arquivo `docker-compose.yml` para o nome que você descobriu e o deploy passará!

## 3. A Rede do Traefik
No `docker-compose.yml`, o app assina a rede externa `traefik-public`.
Se o seu Traefik na VPS usa um nome diferente de rede (ex: `web`, `traefik_net`, `proxy`, ou a default do n8n), você **DEVE** editar a stack e substituir `traefik-public` pelo nome exato da rede do Traefik.

## 4. Deploy
Clique em **Deploy the Stack**.
> O Docker montará silenciosamente os diretórios `/app/uploads` e `/app/data` no host docker via volumes `greenhouse_data` e `greenhouse_uploads`. Sua base será persistente.

Nenhuma porta pública foi exposta (apenas o hostname dinâmico do Traefik). Segurança máxima.
