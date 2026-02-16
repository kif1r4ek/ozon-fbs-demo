import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import crypto from "node:crypto";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: "super_admin" },
  });

  if (existing) {
    console.log("Super admin already exists:", existing.login);
    return;
  }

  const { salt, hash } = createPasswordHash("admin123");

  const superAdmin = await prisma.user.create({
    data: {
      login: "admin",
      name: "Главный Администратор",
      role: "super_admin",
      passwordHash: hash,
      passwordSalt: salt,
    },
  });

  console.log("Super admin created:", superAdmin.login);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
