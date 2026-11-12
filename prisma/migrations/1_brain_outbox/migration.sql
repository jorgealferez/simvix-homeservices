-- CreateTable
CREATE TABLE "BrainOutbox" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "siguienteIntento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoError" TEXT,
    "enviadoAt" TIMESTAMP(3),

    CONSTRAINT "BrainOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainOutbox_clave_key" ON "BrainOutbox"("clave");

-- CreateIndex
CREATE INDEX "BrainOutbox_estado_siguienteIntento_idx" ON "BrainOutbox"("estado", "siguienteIntento");

