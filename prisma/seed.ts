/* eslint-disable no-console */
import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Ensure the three kantins exist
  const kantins = [
    { slug: "h8", name: "H-8 Kantin", city: "Islamabad", fullAddress: "H-8, Islamabad", isLive: true },
    { slug: "chak-shahzad", name: "Chak Shahzad Kantin", city: "Islamabad", fullAddress: "Chak Shahzad, Islamabad", isLive: false },
    { slug: "model-town-multan", name: "Model Town Kantin", city: "Multan", fullAddress: "Model Town, Multan", isLive: false },
  ]
  for (const k of kantins) {
    await prisma.kantin.upsert({
      where: { slug: k.slug },
      update: { name: k.name, city: k.city, fullAddress: k.fullAddress, isLive: k.isLive },
      create: k,
    })
  }
  console.log("✓ Seeded 3 kantins")

  // Seed initial admin user from env (or fall back to default for first deploy)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@iespl.org"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator"

  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      kantinSlug: null,
    },
  })
  console.log(`✓ Admin user ready: ${admin.email}`)
  if (adminPassword === "ChangeMe123!") {
    console.log("  ⚠ Default password is ChangeMe123! — change it after first login")
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
