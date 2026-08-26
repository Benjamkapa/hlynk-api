import { db, pool } from '../dbms/mysql.js';
import { uploadFile } from '../utils/storage.js';

export async function fixResourceImages() {
  try {
    // 1. Ensure Indexes on resource table
    const [indexes] = await db.query("SHOW INDEX FROM resource");
    const indexNames = indexes.map(i => i.Key_name);
    
    if (!indexNames.includes('idx_resource_tenant_title')) {
      console.log('⚙️ Adding index idx_resource_tenant_title to resource table...');
      await db.query('ALTER TABLE resource ADD INDEX idx_resource_tenant_title (tenantId, title)');
      console.log('✅ Created index idx_resource_tenant_title');
    }
    
    if (!indexNames.includes('idx_resource_tenant_type_title')) {
      console.log('⚙️ Adding index idx_resource_tenant_type_title to resource table...');
      await db.query('ALTER TABLE resource ADD INDEX idx_resource_tenant_type_title (tenantId, type, title)');
      console.log('✅ Created index idx_resource_tenant_type_title');
    }

    // 2. Fetch resources with base64 data in meta
    const [rows] = await db.query("SELECT id, meta FROM resource WHERE meta LIKE '%data:image/%'");
    if (rows.length === 0) {
      // console.log('✅ No resource rows with base64 images found.');
      return;
    }

    console.log(`🔧 Found ${rows.length} resource(s) containing base64 images. Converting to static files...`);

    const convertBase64 = async (str) => {
      if (typeof str !== 'string' || !str.startsWith('data:image/')) return str;
      const match = str.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return str;

      const mimetype = match[1];
      const ext = mimetype.split('/')[1] === 'jpeg' ? 'jpg' : mimetype.split('/')[1];
      const buffer = Buffer.from(match[2], 'base64');
      const fakeFile = {
        name: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`,
        data: buffer,
        size: buffer.length,
        mimetype
      };

      try {
        const url = await uploadFile(fakeFile, 'resources');
        return url;
      } catch (err) {
        console.error('Failed to upload base64 image:', err.message);
        return str;
      }
    };

    for (const row of rows) {
      let metaObj = {};
      try {
        metaObj = typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta || {});
      } catch (e) {
        continue;
      }

      let modified = false;

      if (metaObj.imageUrl && typeof metaObj.imageUrl === 'string' && metaObj.imageUrl.startsWith('data:image/')) {
        metaObj.imageUrl = await convertBase64(metaObj.imageUrl);
        modified = true;
      }

      if (Array.isArray(metaObj.images)) {
        const newImages = [];
        for (const img of metaObj.images) {
          if (typeof img === 'string' && img.startsWith('data:image/')) {
            const converted = await convertBase64(img);
            newImages.push(converted);
            modified = true;
          } else {
            newImages.push(img);
          }
        }
        metaObj.images = newImages;
      }

      if (modified) {
        await db.query('UPDATE resource SET meta = ? WHERE id = ?', [JSON.stringify(metaObj), row.id]);
        console.log(`✅ Cleaned base64 images for resource: ${row.id}`);
      }
    }

    console.log('🎉 Resource base64 image cleanup completed!');
  } catch (err) {
    console.error('❌ Error during resource image fix:', err);
  }
}

// Run directly if called from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  fixResourceImages().then(() => {
    if (pool) pool.end();
    process.exit(0);
  });
}
