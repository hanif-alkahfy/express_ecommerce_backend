const express = require('express');
const router = express.Router();
const { authenticateToken, verifyEmail, authorizeRole } = require('../middleware/auth');
const { checkout, listOrders, getOrder, listAllOrders } = require('../controllers/orderController');

router.post('/checkout', authenticateToken, verifyEmail, checkout);
router.get('/', authenticateToken, listOrders);
router.get('/:id', authenticateToken, getOrder);
router.get('/admin/all', authenticateToken, authorizeRole('store_owner'), listAllOrders);

module.exports = router;
