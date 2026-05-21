const express = require('express');
const router = express.Router();
const { generateReport, exportLeadsCSV, getReports } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/generate', verifyToken, generateReport);
router.get('/export-leads', verifyToken, exportLeadsCSV);
router.get('/', verifyToken, getReports);

module.exports = router;
