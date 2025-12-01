/* prisma/seeds/20_cnaes.seed.js */
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Você pode trocar esse arquivo por CSV se preferir (ver parseCSV abaixo)
const JSON_PATH = path.resolve(__dirname, '../data/cnaes.json');
const CSV_PATH  = path.resolve(__dirname, '../data/cnaes.csv');

// Leitor JSON seguro
function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido em ${filePath}: ${e.message}`);
  }
}

// Parser CSV simples (código; título; risco) — separador ; ou ,
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const parts = line.includes(';') ? line.split(';') : line.split(',');
    const code = String(parts[0] || '').trim();
    const title = String(parts[1] || '').trim();
    const nrRisk = Number(parts[2] || '');
    if (!code || !title) continue;
    out.push({
      code,
      title,
      nrRisk: Number.isFinite(nrRisk) ? nrRisk : null,
      source: 'NR-1 Annex (seed)',
      updatedAt: new Date(),
    });
  }
  return out;
}

async function upsertCNAEs(rows) {
  let ok = 0;
  for (const row of rows) {
    const data = {
      code: row.code,
      title: row.title,
      nrRisk: row.nrRisk ?? null,
      source: row.source ?? 'NR-1 Annex (seed)',
      updatedAt: new Date(),
    };
    await prisma.cNAE.upsert({
      where: { code: row.code },
      create: data,
      update: {
        title: data.title,
        nrRisk: data.nrRisk,
        source: data.source,
        updatedAt: data.updatedAt,
      },
    });
    ok++;
  }
  return ok;
}

async function main() {
  console.log('➡️  Seed: CNAE catalog (NR-1)');
  let rows = readJsonSafe(JSON_PATH);
  if (!rows) {
    rows = parseCSV(CSV_PATH);
  }
  if (!rows || rows.length === 0) {
    // Pequeno fallback para não quebrar — substitua pelo seu arquivo real
    console.warn('⚠️  Nenhum arquivo encontrado em prisma/data/cnaes.json ou .csv — usando fallback mínimo.');
    rows = [
      { code: '0111-3/01', title: 'Cultivo de arroz', nrRisk: 3 },
      { code: '6201-5/01', title: 'Desenvolvimento de programas de computador sob encomenda', nrRisk: 2 },
      { code: '4711-3/01', title: 'Comércio varejista de mercadorias em geral - hipermercados', nrRisk: 3 },
    ];
  }
  const count = await upsertCNAEs(rows);
  console.log(`✅ CNAEs upserted: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de CNAEs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
