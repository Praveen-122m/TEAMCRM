const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  getLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  assignLead,
  updateLead,
  deleteLead,
  exportCsv,
  exportExcel,
  exportPdf,
} = require('../controllers/leadController');

router.get('/export/csv', protect, exportCsv);
router.get('/export/excel', protect, exportExcel);
router.get('/export/pdf', protect, exportPdf);

router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById);
router.post('/', protect, createLead);
router.put('/:id/status', protect, updateLeadStatus);
router.put('/:id/assign', protect, isAdmin, assignLead);
router.put('/:id', protect, updateLead);
router.delete('/:id', protect, isAdmin, deleteLead);

module.exports = router;
