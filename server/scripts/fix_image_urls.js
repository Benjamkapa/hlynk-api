import { db } from '../dbms/mysql.js';
import 'dotenv/config';

async function fixUrls() {
  const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  console.log(`🔧 Normalizing product image URLs to: ${baseUrl}`);

  try {
    // 1. Fetch all products with localhost URLs
    const [products] = await db.query(
      "SELECT id, imageUrl FROM product WHERE imageUrl LIKE '%localhost:3000%'"
    );

    console.log(`📝 Found ${products.length} products to update.`);

    for (const product of products) {
      if (!product.imageUrl) continue;

      // Extract the relative path (e.g., /uploads/products/image.jpg)
      // This handles cases where it might be http://localhost:3000/uploads/...
      const relativePath = product.imageUrl.split('/uploads/')[1];
      
      if (relativePath) {
        const newUrl = `${baseUrl}/uploads/${relativePath}`;
        await db.query(
          "UPDATE product SET imageUrl = ?, updatedAt = NOW() WHERE id = ?",
          [newUrl, product.id]
        );
        console.log(`✅ Updated Product ${product.id}`);
      }
    }

    console.log('🚀 All product image URLs have been fixed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing URLs:', err);
    process.exit(1);
  }
}

fixUrls();
