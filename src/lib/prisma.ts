import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  let dbUrl = "file:./dev.db";

  // Na Vercel (onde o filesystem é read-only), copiamos o banco dev.db inicial
  // para /tmp (que é gravável) para permitir leituras e escritas sem erro
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const tmpDbPath = "/tmp/dev.db";
    const localDbPath = path.join(process.cwd(), "dev.db");

    try {
      // Garante que o diretório pai (como /tmp ou D:\tmp) existe
      const tmpDir = path.dirname(tmpDbPath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      if (!fs.existsSync(tmpDbPath)) {
        console.log(`[Prisma] Copiando banco SQLite de ${localDbPath} para ${tmpDbPath}`);
        if (fs.existsSync(localDbPath)) {
          fs.copyFileSync(localDbPath, tmpDbPath);
          fs.chmodSync(tmpDbPath, 0o666);
          console.log("[Prisma] Banco copiado com sucesso.");
        } else {
          console.warn("[Prisma] Banco inicial dev.db não encontrado em", localDbPath);
        }
      } else {
        console.log("[Prisma] Banco de dados já existe no /tmp");
      }
      dbUrl = `file:${tmpDbPath}`;
    } catch (e) {
      console.error("[Prisma] Erro ao clonar banco de dados no /tmp:", e);
    }
  }

  const adapter = new PrismaBetterSqlite3({
    url: dbUrl,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
