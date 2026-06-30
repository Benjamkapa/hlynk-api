import express from 'express';
import { 
  getSystemStats, 
  listTenants, 
  getSystemHealth, 
  getSubscriptions, 
  impersonateUser,
  getUsers,
  deleteUser,
  getSessions,
  terminateSession,
  getUserActivity,
  upgradePlan,
  suspendTenant,
  activateTenant,
  deleteTenant,
  updateTenant,
  getActivityLogs,
  resolveAllTickets,
  getSettings,
  updateSettings,
  getSchedules,
  runReportQuery,
  getGlobalTransactions,
  getTransactionDetails,
  listPlatformReviews,
  updatePlatformReviewStatus,
  registerTenant,
  getPayouts,
  markPayoutPaid,
  updateTenantPayoutAccount,
  listNewPayouts,
  getVaultStats,
  testB2C,
  extendSubscriptionDays,
  downloadDatabaseBackup,
  restoreDatabaseBackup
} from '../controllers/admin.js';

import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/backup/db', downloadDatabaseBackup);
router.post('/backup/restore', restoreDatabaseBackup);
router.get('/stats', getSystemStats);
router.get('/tenants', listTenants);
router.put('/tenants/:id/upgrade', upgradePlan);
router.post('/tenants/:id/extend-days', extendSubscriptionDays);
router.put('/tenants/:id/suspend', suspendTenant);
router.put('/tenants/:id/activate', activateTenant);
router.delete('/tenants/:id', deleteTenant);
router.put('/tenants/:id', updateTenant);
router.post('/tenants', registerTenant);
router.put('/tenants/:id/payout-account', updateTenantPayoutAccount);

router.get('/health', getSystemHealth);
router.get('/subscriptions', getSubscriptions);
router.get('/activity', getActivityLogs);
router.post('/tickets/resolve-all', resolveAllTickets);
router.get('/settings', getSettings);
router.post('/settings', updateSettings);
router.put('/settings', updateSettings);

router.get('/schedules', getSchedules);
router.post('/reports/query', runReportQuery);
router.get('/transactions', getGlobalTransactions);
router.get('/transactions/:id', getTransactionDetails);

router.get('/payouts', getPayouts);
router.post('/payouts/:tenantId/mark-paid', markPayoutPaid);
router.get('/payouts/records', listNewPayouts);
router.get('/finance/vault', getVaultStats);
router.post('/test-b2c', testB2C);

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/users/:id/activity', getUserActivity);
router.post('/users/:id/impersonate', impersonateUser);

router.get('/sessions', getSessions);
router.put('/sessions/:id/terminate', terminateSession);

router.get('/reviews', listPlatformReviews);
router.patch('/reviews/:id', updatePlatformReviewStatus);

export default router;
