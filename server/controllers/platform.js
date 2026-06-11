import { db } from '../dbms/mysql.js';
import { sendPushToAdmins } from './notifications.js';

export const getPublicStats = async (req, res) => {
  try {
    const [[tenantRes], [reviewRes]] = await Promise.all([
      db.query(`SELECT COUNT(*) as total FROM tenant`),
      db.query(`SELECT COUNT(*) as total, AVG(rating) as avgRating FROM platformreview`)
    ]);

    
    return res.json({
      success: true,
      data: {
        totalBusinesses: Number(tenantRes[0]?.total || 0) + 540,
        averageRating: Number(reviewRes[0]?.avgRating || 4.9).toFixed(1),
        totalReviews: Number(reviewRes[0]?.total || 0)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public stats' });
  }
};

export const getPlatformReviews = async (req, res) => {
  const { limit = 12 } = req.query;
  try {
    const [reviews] = await db.query(`
      SELECT 
        pr.id, pr.userId, pr.tenantId, pr.rating, 
        pr.reviewText as comment, pr.businessName, pr.ownerName as name, 
        pr.createdAt, u.photoUrl
      FROM platformreview pr
      LEFT JOIN user u ON pr.userId = u.id
      WHERE pr.status = 1
      ORDER BY pr.createdAt DESC
      LIMIT ?
    `, [Number(limit)]);

    return res.json({ success: true, items: reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

export const getNotifications = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [notifications] = await db.query(`
      SELECT *, (status = 1) as isRead FROM notification 
      WHERE (tenantId = ? OR tenantId IS NULL) 
      ORDER BY createdAt DESC 
      LIMIT 50
    `, [tenantId]);
    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getNotifications Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    if (id === 'all') {
      await db.query(`UPDATE notification SET status = 1 WHERE tenantId = ? OR tenantId IS NULL`, [tenantId]);
    } else {
      await db.query(`UPDATE notification SET status = 1 WHERE id = ? AND (tenantId = ? OR tenantId IS NULL)`, [id, tenantId]);
    }
    return res.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};
export const clearNotifications = async (req, res) => {
  const { tenantId } = req.user;
  try {
    // Hard delete to "clear space" as requested
    await db.query(`DELETE FROM notification WHERE tenantId = ?`, [tenantId]);
    return res.json({ success: true, message: 'All notifications permanently deleted' });
  } catch (err) {
    console.error('clearNotifications Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
};
export const submitPlatformReview = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { rating, reviewText } = req.body;

  try {
    // 1. Get business and user names for the review record
    const [[tenant]] = await db.query('SELECT businessName FROM tenant WHERE id = ?', [tenantId]);
    const [[user]] = await db.query('SELECT name FROM user WHERE id = ?', [userId]);

    const reviewId = 'PR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

    await db.query(`
      INSERT INTO platformreview (id, tenantId, userId, rating, reviewText, businessName, ownerName, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
    `, [reviewId, tenantId, userId, rating, reviewText, tenant?.businessName || 'Business', user?.name || 'Owner']);

    // Notify Super Admins of new review
    sendPushToAdmins({
      title: 'New Platform Review ⭐',
      body: `Review from ${user?.name || 'Owner'} (${tenant?.businessName}): "${reviewText.substring(0, 50)}${reviewText.length > 50 ? '...' : ''}"`,
      data: { url: '/admin/reviews' }
    }).catch(e => console.error('[PUSH] Admin notification failed:', e.message));

    return res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('submitPlatformReview Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};
