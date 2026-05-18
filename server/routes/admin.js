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
  runReportQuery
} from '../controllers/admin.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getSystemStats);
router.get('/tenants', listTenants);
router.put('/tenants/:id/upgrade', upgradePlan);
router.put('/tenants/:id/suspend', suspendTenant);
router.put('/tenants/:id/activate', activateTenant);
router.delete('/tenants/:id', deleteTenant);
router.put('/tenants/:id', updateTenant);
router.get('/health', getSystemHealth);
router.get('/subscriptions', getSubscriptions);
router.get('/activity', getActivityLogs);
router.post('/tickets/resolve-all', resolveAllTickets);
router.get('/settings', getSettings);
router.post('/settings', updateSettings);
router.get('/schedules', getSchedules);
router.post('/reports/query', runReportQuery);

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/users/:id/activity', getUserActivity);
router.post('/users/:id/impersonate', impersonateUser);

router.get('/sessions', getSessions);
router.put('/sessions/:id/terminate', terminateSession);

export default router;
