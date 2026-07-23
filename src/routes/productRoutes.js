const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { createProduct, getProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.post('/', authenticateToken, authorizeRole('store_owner'), createProduct);
router.get('/:id', getProduct);
router.put('/:id', authenticateToken, authorizeRole('store_owner'), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole('store_owner'), deleteProduct);

module.exports = router;
