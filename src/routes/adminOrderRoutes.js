const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { updateOrderStatus } = require('../controllers/orderController');

router.put('/:id/status', authenticateToken, authorizeRole('store_owner'), updateOrderStatus);

module.exports = router;
