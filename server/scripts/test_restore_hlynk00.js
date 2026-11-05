import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testRestore() {
  const currentDb = 'hlynk';
  console.log('Testing restore directly into:', currentDb);

  let sqlString = fs.readFileSync('backups/backup_20261006_203441/db_dump.sql', 'utf8');
  if (sqlString.charCodeAt(0) === 0xFEFF) sqlString = sqlString.slice(1);

  // 1. Strip CREATE DATABASE and USE
  sqlString = sqlString.replace(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?[a-zA-Z0-9_]+`?\s*;/gi, '');
  sqlString = sqlString.replace(/USE\s+`?[a-zA-Z0-9_]+`?\s*;/gi, '');
  sqlString = sqlString.replace(/`[a-zA-Z0-9_]+`\.(`[a-zA-Z0-9_]+`)/g, '$1');

  // 2. Normalize legacy varchar(50) tenantId
  sqlString = sqlString.replace(/(`?tenantId`?\s+varchar)\(50\)/gi, '$1(191)');

  // 3. Normalize collations
  sqlString = sqlString.replace(/utf8mb4_0900_ai_ci/gi, 'utf8mb4_unicode_ci');
  sqlString = sqlString.replace(/CHARSET=utf8mb4(?!\s+COLLATE)/gi, 'CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

  // 4. Object NULL
  sqlString = sqlString.replaceAll("'[object Object]'", 'NULL');

  const statements = sqlString.split('\n-- STATEMENT_BOUNDARY --\n').map(s => s.trim()).filter(Boolean);

  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL
  });

  try {
    await conn.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query(`USE \`${currentDb}\``);

    console.log(`Total statements: ${statements.length}`);
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];

      // Fix tenant
      if (/^INSERT INTO `?tenant`?/i.test(stmt)) {
        stmt = stmt.replace(
          /,\s*'([A-Za-z][A-Za-z0-9_]*)'\s*\)/g,
          (m, word) => `, '["${word}"]')`
        );
      }

      // Fix user
      if (/^INSERT INTO `?user`?/i.test(stmt)) {
        stmt = stmt.replace(
          /(?<=[,\s])('(?:[a-zA-Z][a-zA-Z0-9_]*)'(?:,\s*'[a-zA-Z][a-zA-Z0-9_]*')+)(?=,\s*[01]\s*,)/g,
          (match) => {
            const perms = [...match.matchAll(/'([^']+)'/g)].map(m => m[1]);
            return `'${JSON.stringify(perms)}'`;
          }
        );
        stmt = stmt.replace(
          /(?<=[,\s])'([a-zA-Z][a-zA-Z0-9_]*)'(?=,\s*[01]\s*,)/g,
          (match, word) => `'["${word}"]'`
        );
      }

      try {
        await conn.query(stmt);
      } catch (err) {
        console.error(`❌ Statement ${i + 1} FAILED!`);
        console.error('Statement snippet:', stmt.slice(0, 200));
        console.error('Error message:', err.message);
        break;
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
}

testRestore();
