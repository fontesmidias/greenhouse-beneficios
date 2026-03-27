const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const dbPath = path.join(__dirname, '../prisma/dev.db');

async function migrate() {
  console.log("Iniciando migração de SQLite para PostgreSQL...");
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err: any) => {
    if (err) {
      console.error("Erro ao abrir banco de dados SQLite antigo:", err.message);
      process.exit(1);
    }
  });

  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM User", async (err: any, rows: any[]) => {
      if (err) return reject(err);
      
      console.log(`Migrando ${rows.length} Usuários...`);
      for (const row of rows) {
        try {
          // Check if exists
          const exists = await prisma.user.findUnique({ where: { email: row.email } });
          if (!exists) {
            await prisma.user.create({
              data: {
                id: row.id,
                nome: row.nome,
                email: row.email,
                senha: row.senha,
                cargo: row.cargo,
                status: row.status,
                role: row.role,
                resetToken: row.resetToken,
                resetTokenExpiry: row.resetTokenExpiry ? new Date(row.resetTokenExpiry) : null,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt)
              }
            });
          }
        } catch (e) {
          console.error("Erro ao migrar usuário", row.email, e);
        }
      }

      console.log("Migração de Usuários concluída.");
      resolve(true);
    });
  });
}

migrate()
  .then(() => {
    console.log("Migração total finalizada.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Migration falhou.", e);
    process.exit(1);
  });
