/**
 * Cifra los campos PII existentes en la tabla Client (phone, dni, address).
 * Idempotente: si el valor ya está cifrado (`enc:v1:…`) lo deja como está.
 *
 * Uso:
 *   tsx prisma/scripts/encrypt-existing-pii.ts
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, isEncrypted } from '../../src/lib/security/crypto';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    select: { id: true, phone: true, dni: true, address: true },
  });
  let touched = 0;
  for (const c of clients) {
    const update: Record<string, string | null> = {};
    if (c.phone && !isEncrypted(c.phone)) update.phone = encrypt(c.phone);
    if (c.dni && !isEncrypted(c.dni)) update.dni = encrypt(c.dni);
    if (c.address && !isEncrypted(c.address)) update.address = encrypt(c.address);
    if (Object.keys(update).length) {
      await prisma.client.update({ where: { id: c.id }, data: update });
      touched++;
    }
  }
  console.log(`✔ Encriptados ${touched} clientes (de ${clients.length}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
