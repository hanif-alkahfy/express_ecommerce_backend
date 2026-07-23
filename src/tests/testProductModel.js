const db = require('../models');
const logger = require('../config/logger');

async function testProductModel() {
  try {
    logger.info('Starting Product model test...');

    await db.sequelize.authenticate();
    logger.info('Database connection established');

    logger.info('\n=== Test 1: Create new product ===');
    const testProduct = await db.Product.create({
      name: 'Test Game Product',
      description: 'This is a test digital game product',
      price: 59.99,
      stock_quantity: 100,
      category: 'RPG',
      image_url: 'https://example.com/image.jpg',
      digital_file_url: 'https://example.com/game.zip'
    });
    logger.info('Product created:', testProduct.toJSON());

    logger.info('\n=== Test 2: Check stock availability (sufficient) ===');
    const hasStock = testProduct.checkStock(50);
    logger.info('Has stock for 50 units:', hasStock);

    logger.info('\n=== Test 3: Check stock availability (insufficient) ===');
    const hasStockInsufficient = testProduct.checkStock(150);
    logger.info('Has stock for 150 units:', hasStockInsufficient);

    logger.info('\n=== Test 4: Deduct stock ===');
    const newStock = await testProduct.deductStock(30);
    logger.info('Stock after deducting 30 units:', newStock);
    logger.info('Product stock_quantity:', testProduct.stock_quantity);

    logger.info('\n=== Test 5: Restore stock ===');
    const restoredStock = await testProduct.restoreStock(20);
    logger.info('Stock after restoring 20 units:', restoredStock);
    logger.info('Product stock_quantity:', testProduct.stock_quantity);

    logger.info('\n=== Test 6: Try to deduct more than available (should fail) ===');
    try {
      await testProduct.deductStock(200);
      logger.error('Test should have failed but did not!');
    } catch (error) {
      logger.info('Expected error caught:', error.message);
    }

    logger.info('\n=== Test 7: Try to set negative stock (should fail) ===');
    try {
      await testProduct.update({ stock_quantity: -10 });
      logger.error('Test should have failed but did not!');
    } catch (error) {
      logger.info('Expected error caught:', error.message);
    }

    logger.info('\n=== Test 8: Find product by ID ===');
    const foundProduct = await db.Product.findByPk(testProduct.id);
    logger.info('Product found:', foundProduct ? foundProduct.name : 'Not found');

    logger.info('\n=== Test 9: Update product details ===');
    await foundProduct.update({
      name: 'Updated Game Product',
      price: 49.99
    });
    logger.info('Product updated:', foundProduct.name, 'Price:', foundProduct.price);

    logger.info('\n=== Test 10: Create product with validation errors ===');
    try {
      await db.Product.create({
        name: '',
        price: -10,
        stock_quantity: -5
      });
      logger.error('Test should have failed but did not!');
    } catch (error) {
      logger.info('Expected validation errors caught');
    }

    logger.info('\n=== Test 11: Search products by category ===');
    const rpgProducts = await db.Product.findAll({
      where: { category: 'RPG' }
    });
    logger.info('RPG products found:', rpgProducts.length);

    logger.info('\n=== Test 12: Test with transaction (deduct and restore) ===');
    const transaction = await db.sequelize.transaction();
    try {
      await testProduct.deductStock(10, transaction);
      logger.info('Stock deducted in transaction:', testProduct.stock_quantity);
      
      await testProduct.restoreStock(10, transaction);
      logger.info('Stock restored in transaction:', testProduct.stock_quantity);
      
      await transaction.commit();
      logger.info('Transaction committed successfully');
    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction rolled back:', error.message);
    }

    logger.info('\n=== Test 13: Count products ===');
    const productCount = await db.Product.count();
    logger.info('Total products:', productCount);

    logger.info('\n=== Cleanup: Delete test product ===');
    await db.Product.destroy({ where: { id: testProduct.id } });
    logger.info('Test product deleted');

    logger.info('\n=== All tests completed successfully! ===');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

testProductModel();
