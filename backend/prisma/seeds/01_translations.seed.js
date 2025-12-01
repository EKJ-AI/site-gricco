// prisma/seeds/01_translations.seed.js
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const LOCALES = [
  {
    cultureId: 'pt-BR',
    description: 'Português (Brasil)',
    icon: 'BR',
    order: 1,
    active: true,
    file: path.resolve(__dirname, '../../src/i18n/pt.json'),
  },
  {
    cultureId: 'en-US',
    description: 'English (United States)',
    icon: 'US',
    order: 2,
    active: true,
    file: path.resolve(__dirname, '../../src/i18n/en.json'),
  },
];

const CHUNK_SIZE = 250;
// Limite para evitar estourar páginas de índice se houver @@index([description]) btree
const MAX_DESC_CHARS = 2000;
// ----------------------------

function normalizeDescription(val) {
  return val == null ? '' : String(val);
}

function md5Hex(input = '') {
  return crypto.createHash('md5').update(String(input)).digest('hex');
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido em ${filePath}: ${e.message}`);
  }
}

// Achata objetos aninhados: "a.b.c": valor
function flattenKeys(obj, prefix = '') {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenKeys(v, key));
    } else {
      out[key] = v;
    }
  });
  return out;
}

// Para satisfazer unicidades por hash, mantemos code = key = fullKey (único por cultura).
function deriveCodeAndKey(fullKey) {
  const safe = String(fullKey ?? '').trim();
  return { code: safe, key: safe };
}

function capDescription(val) {
  const s = val == null ? '' : String(val);
  if (s.length <= MAX_DESC_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_DESC_CHARS), truncated: true };
}

async function upsertCulture({ cultureId, description, icon, order, active }) {
  await prisma.culture.upsert({
    where: { id: cultureId },
    update: { description, icon, order, active },
    create: { id: cultureId, description, icon, order, active },
  });
}

// Normaliza base legada: garante code = key e sincroniza hashes (keyHash/codeHash)
async function normalizeExistingLabels(cultureId) {
  const rows = await prisma.label.findMany({
    where: { cultureId },
    select: { id: true, code: true, key: true, keyHash: true, codeHash: true },
  });

  const updates = [];
  for (const r of rows) {
    const desiredCode = r.key; // queremos code = key
    const desiredKeyHash = md5Hex(r.key ?? '');
    const desiredCodeHash = desiredCode ? md5Hex(desiredCode) : null;

    if (
      r.code !== desiredCode ||
      r.keyHash !== desiredKeyHash ||
      r.codeHash !== desiredCodeHash
    ) {
      updates.push(
        prisma.label.update({
          where: { id: r.id },
          data: {
            code: desiredCode,
            keyHash: desiredKeyHash,
            codeHash: desiredCodeHash,
          },
        })
      );
    }
  }

  if (updates.length) await Promise.all(updates);
}

async function upsertLabels(cultureId, dict) {
  await normalizeExistingLabels(cultureId);

  const flat = flattenKeys(dict);
  const entries = Object.entries(flat);

  let truncatedCount = 0;

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async ([fullKey, value]) => {
        const { code, key } = deriveCodeAndKey(fullKey);
        //const { text: description, truncated } = capDescription(value);
        //if (truncated) truncatedCount++;
        const description = normalizeDescription(value);

        const keyHash = md5Hex(key);
        const codeHash = code ? md5Hex(code) : null;

        // Upsert pela UNIQUE (cultureId, keyHash) — conforme novo schema
        await prisma.label.upsert({
          where: { cultureId_keyHash: { cultureId, keyHash } },
          update: {
            code,                 // mantemos code = key
            description,          // evita estouro do índice btree
            codeHash,             // mantém hash coerente com 'code'
            // key/keyHash não mudam no update pois a UNIQUE é por keyHash
          },
          create: {
            cultureId,
            code,
            key,
            description,
            keyHash,
            codeHash,
          },
        });
      })
    );
  }

  const total = await prisma.label.count({ where: { cultureId } });
  return { total, truncatedCount };
}

async function main() {
  console.log('➡️  Seed: translations (Culture & Label)');

  // 1) Culturas
  for (const c of LOCALES) await upsertCulture(c);
  console.log('✅ Culturas upserted:', LOCALES.map((c) => c.cultureId).join(', '));

  // 2) Labels por locale
  for (const c of LOCALES) {
    console.log(`\n➡️  Processando labels para ${c.cultureId}...`);
    const dict = readJsonSafe(c.file);
    const { total, truncatedCount } = await upsertLabels(c.cultureId, dict);
    console.log(
      `✅ ${c.cultureId}: ${total} labels sincronizados. ${
        truncatedCount ? `(${truncatedCount} descriptions truncadas a ${MAX_DESC_CHARS} chars)` : ''
      }`
    );
  }

  console.log('\n🎉 Seed de translations finalizado.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de translations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
