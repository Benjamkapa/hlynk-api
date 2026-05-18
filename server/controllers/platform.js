import { db } from '../dbms/mysql.js';

export const getPublicStats = async (req, res) => {
  try {
    const [[tenantRes], [reviewRes]] = await Promise.all([
      db.query(`SELECT COUNT(*) as total FROM Tenant`),
      db.query(`SELECT COUNT(*) as total, AVG(rating) as avgRating FROM PlatformReview`)
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
      FROM PlatformReview pr
      LEFT JOIN User u ON pr.userId = u.id
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
      SELECT *, (status = 1) as isRead FROM Notification 
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
      await db.query(`UPDATE Notification SET status = 1 WHERE tenantId = ? OR tenantId IS NULL`, [tenantId]);
    } else {
      await db.query(`UPDATE Notification SET status = 1 WHERE id = ? AND (tenantId = ? OR tenantId IS NULL)`, [id, tenantId]);
    }
    return res.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};
