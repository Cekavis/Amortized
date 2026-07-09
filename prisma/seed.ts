import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "amortized-admin";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Seed admin "${username}" already exists.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      name: "管理员",
      passwordHash: await hashPassword(password),
      role: "admin",
      categories: {
        create: [
          { name: "电子设备", color: "#0f766e", sortOrder: 10 },
          { name: "家居", color: "#f59e0b", sortOrder: 20 },
          { name: "出行", color: "#e11d48", sortOrder: 30 },
        ],
      },
    },
  });

  console.log(`Seed admin created: ${user.username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
