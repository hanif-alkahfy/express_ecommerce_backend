const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listProducts, createProduct, getProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/', listProducts);
router.post('/', authenticateToken, authorizeRole('store_owner'), createProduct);
router.get('/:id', getProduct);
router.put('/:id', authenticateToken, authorizeRole('store_owner'), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole('store_owner'), deleteProduct);

module.exports = router;
