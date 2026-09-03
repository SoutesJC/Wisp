-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'gerando_roteiro',
    "input_mode" TEXT NOT NULL,
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "assunto_original" TEXT,
    "roteiro_json" TEXT,
    "custo_acumulado" REAL NOT NULL DEFAULT 0,
    "storage_path" TEXT,
    "video_path" TEXT,
    "erro" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "itens_gerados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "beat_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "custo_usd" REAL NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "itens_gerados_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
