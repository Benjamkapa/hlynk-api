import { db, pool } from '../dbms/mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixImages() {
  try {
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const [rows] = await db.query('SELECT id, imageUrl FROM product WHERE imageUrl LIKE "data:image/%"');
    console.log('Found', rows.length, 'products with base64 images.');

    for (const row of rows) {
      const match = row.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) {
        console.log('Regex did not match for', row.id);
        continue;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const data = Buffer.from(match[2], 'base64');
      const fileName = `${row.id}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, data);
      
      // In local dev, publicUrl format
      const publicUrl = `${process.env.BACKEND_URL}/uploads/products/${fileName}`;
      await db.query('UPDATE product SET imageUrl = ? WHERE id = ?', [publicUrl, row.id]);
      console.log('Fixed', row.id);
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing images:', err.message);
    if (pool) await pool.end();
    process.exit(1);
  }
}

fixImages();
