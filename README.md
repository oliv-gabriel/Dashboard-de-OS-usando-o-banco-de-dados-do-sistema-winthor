# Dashboard de Separação

Painel de acompanhamento em tempo real das Ordens de Serviço de separação, com dados vindos do banco Oracle (Winthor).

## Funcionalidades

- 📊 Painel com lista de OS pendentes, % separação e % conferência
- 📈 Gráficos de OS concluídas por dia e por funcionário
- 🔄 Atualização automática configurável (10s, 30s, 1min, 5min)
- 🖥️ Modo tela cheia para monitores do setor
- 🔍 Filtros por filial e data

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- Acesso ao banco Oracle (Winthor)

## Configuração

Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como modelo):

```env
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_CONNECTION_STRING=(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=seu_ip)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=seu_servico)))
```

---

## Opção 1 — Rodar com Node.js (desenvolvimento)

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Opção 2 — Rodar com Docker (produção)

```bash
# Subir o container
docker compose up -d

# Ver os logs
docker compose logs -f

# Parar
docker compose down
```

Acesse: [http://localhost:3000](http://localhost:3000)

> O Docker lê automaticamente o arquivo `.env` da raiz do projeto.

---

## Tecnologias

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [OracleDB](https://www.npmjs.com/package/oracledb) (Thin mode)
- [Recharts](https://recharts.org/) (gráficos)
- [Lucide React](https://lucide.dev/) (ícones)
