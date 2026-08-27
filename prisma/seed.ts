import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Production seed is intentionally empty
  console.log("Database initialized. Ready for production accounts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
