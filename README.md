# GreenHouse - Plataforma Operacional de Benefícios 🍃 (V2)

A aplicação definitiva para gestão corporativa de benefícios (VA/VT) e emissão de contratos/recibos em massa para o Departamento Pessoal. Construída puramente sob os rigores de automação e performance para substituir processos ineficientes.

## 🚀 Novidades na V2 (Versão Atual)

- **UI/UX Dark Mode Premium:** Frontend completamente re-arquitetado. Abandonamos o design corporativo em favor de um dashboard futurista inspirado em portfólios *Awwwards*, utilizando recursos avançados de TailwindCSS (Mesh gradients, Glassmorphism denso, grids neon).
- **Motor PDF 'Contracheque':** O gerador de PDFs original (Folha A4 inteira) foi otimizado para um padrão compacto (meia-folha A5 em Paisagem) semelhante a um holerite de pagamento. Inclui justificação matemática de parágrafos declaratórios e injeção automática de **Logo Customizado**.
- **Fórmulas Nativas de Excel:** O template de ingestão baixado pela plataforma agora possui processamento matemático nas células (`=E2*F2`), poupando o RH de preencher dados multiplicativos à mão. O backend possui inteligência de casting (conversão para BRL local `R$`) para os resultados gerados pelo motor do Excel.
- **Banco de Dados Zero-Friction & Auto-Cleanup:** O Prisma/SQLite foi desligado para evitar panes de permissões de binários no Docker Windows. Arquitetamos um micro-banco NoSQL local em arquivo JSON. 
  - **Lixeira Ativa:** Ao gerar novos lotes, o sistema varre e exclui automaticamente PDFs físicos com mais de 30 dias de idade. 
  - **Granularidade:** Exclusão individual de recibos agora permitida via UI.

## 🗂 Estrutura Técnica
- **Frontend:** Next.js Server Components, React 18, Tailwind.
- **Geração PDF:** *pdf-lib* em buffer de memória.
- **Processamento:** *xlsx* bufferizado.

## 💻 Como Rodar (Ambiente Docker Local)

O projeto está encapsulado. Apenas rode o comando abaixo na raiz:
```bash
docker-compose -f docker-compose.local.yml up -d --build
```
> Acesse `http://localhost:3000`. 
> Lembre-se de colocar sua logo como `logo.png` dentro da pasta `public/` caso deseje o cabeçalho impresso oficial nos holerites gerados.

## 🌟 RoadMap (Próximos Passos - V3)
1. Conectar a plataforma ao disparador do **Evolution API (WhatsApp)** e enviar os *Magic Links* aos colaboradores individualmente com apenas 1 clique no painel Dark Mode.
2. Tela receptora do Colaborador *Mobile-First*, onde ele abre o link e assina o PDF na tela do próprio celular nativamente usando tecnologia Web Canvas.
3. Carimbo digital do hash da assinatura no PDF físico gerado e salvo por nós.

_Produzido pela Equipe BMAD via IA Autônoma._
