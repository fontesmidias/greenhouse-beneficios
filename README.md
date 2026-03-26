# GreenHouse - Portal de Benefícios 🍃

Um portal moderno para gestão corporativa de benefícios e automação de assinaturas eletrônicas com validade jurídica (VA/VT). 
Desenvolvido com o poder da Stack **Next.js 14, TailwindCSS, Prisma (SQLite) e PDF-lib**, arquitetado sob containerização pura em **Docker** (para VPS/Portainer).

## 🗂 Estrutura do Projeto

Este projeto é independente e não usa mais gambiarras como o "n8n com Google Sheets". Tudo foi internalizado na aplicação garantindo estabilidade e registro legal das rotinas.

- **Frontend:** Next.js Server Components e React com uma interface *Glassmorphism* limpa desenvolvida para Mobile-First (RH pode aprovar pelo celular).
- **Backend APIs:**
  - `POST /api/upload`: Leitura assíncrona da planilha de benefícios via `xlsx`.
  - `GET /api/template`: Geração instantânea do arquivo modelo obrigatório do Departamento Pessoal.
  - `POST /api/process`: Inserções ACID no banco SQLite e montagem em tempo-real dos arquivos `.pdf` oficiais a serem assinados.
- **Log System:** Todos os passos, falhas e melhorias da AI são rastreados nativamente na pasta `logs/`.

## 🚀 Como Rodar Localmente (Desenvolvimento)

Abra o terminal na pasta `app-beneficios` e rode:
```bash
docker-compose -f docker-compose.local.yml up -d
```
> O volume espelhará o código ao vivo (Hot-Reload) em http://localhost:3000

## 📦 Deploy para Produção (VPS via Portainer)

Apenas copie o conteúdo do `docker-compose.yml` da raiz e use no Portainer (Add Stack). Ele construirá a aplicação a partir do `Dockerfile` multi-stage que compila o Prisma e otimiza a imagem em Alpine Linux.

## 🌟 Funcionalidades
1. **Modelos Exatos:** Você não precisa adivinhar o formato do Excel da folha. Baixe o modelo dinâmico no App.
2. **Logs Transparentes:** Problemas ao ler linhas do Excel? O sistema te diz onde estão de maneira instantânea e guarda isso em Logs.
3. **Assinatura Autônoma (Em breve):** Em vez de Gov.br, o colaborador usa nosso painel touch-friendly pelo Evolution API no Whatsapp. O IP dele é chancelado.

_Desenvolvido sob o fluxo BMAD com os times de Arquitetura, UX e Desenvolvimento._
