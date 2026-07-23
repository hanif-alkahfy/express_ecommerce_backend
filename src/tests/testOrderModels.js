const db = require('../models');
const logger = require('../config/logger');

async function testOrderModels() {
  try {
    logger.info('Starting Order and OrderItem models test...');

    await db.sequelize.authenticate();
    logger.info('Database connection established');

    logger.info('\n=== Test 1: Create test user ===');
    const testUser = await db.User.create({
      email: 'ordertest@example.com',
      password_hash: 'TestPassword123!',
      name: 'Order Test User',
      role: 'customer',
      is_verified: true
    });
    logger.info('Test user created:', testUser.id);

    logger.info('\n=== Test 2: Create test products ===');
    const product1 = await db.Product.create({
      name: 'Game Product 1',
      description: 'Test game 1',
      price: 50.00,
      stock_quantity: 100,
      category: 'RPG'
    });
    const product2 = await db.Product.create({
      name: 'Game Product 2',
      description: 'Test game 2',
      price: 30.00,
      stock_quantity: 50,
      category: 'Action'
    });
    logger.info('Test products created:', product1.id, product2.id);

    logger.info('\n=== Test 3: Create order ===');
    const order = await db.Order.create({
      user_id: testUser.id,
      total_amount: 0,
      status: 'pending'
    });
    logger.info('Order created:', order.toJSON());

    logger.info('\n=== Test 4: Create order items with auto-calculated subtotal ===');
    const orderItem1 = await db.OrderItem.create({
      order_id: order.id,
      product_id: product1.id,
      quantity: 2,
      unit_price: product1.price
    });
    logger.info('OrderItem 1 created:', orderItem1.toJSON());

    const orderItem2 = await db.OrderItem.create({
      order_id: order.id,
      product_id: product2.id,
      quantity: 3,
      unit_price: product2.price
    });
    logger.info('OrderItem 2 created:', orderItem2.toJSON());

    logger.info('\n=== Test 5: Calculate order total ===');
    const calculatedTotal = await order.calculateTotal();
    logger.info('Calculated total:', calculatedTotal);

    logger.info('\n=== Test 6: Update order total ===');
    await order.update({ total_amount: calculatedTotal });
    logger.info('Order total updated:', order.total_amount);

    logger.info('\n=== Test 7: Check if order can be cancelled ===');
    const canCancel = order.canBeCancelled();
    logger.info('Can be cancelled:', canCancel);

    logger.info('\n=== Test 8: Mark order as paid ===');
    await order.markAsPaid();
    logger.info('Order status after markAsPaid:', order.status);

    logger.info('\n=== Test 9: Check if paid order can be cancelled ===');
    const canCancelPaid = order.canBeCancelled();
    logger.info('Paid order can be cancelled:', canCancelPaid);

    logger.info('\n=== Test 10: Try to mark paid order as paid again (should fail) ===');
    try {
      await order.markAsPaid();
      logger.error('Test should have failed but did not!');
    } catch (error) {
      logger.info('Expected error caught:', error.message);
    }

    logger.info('\n=== Test 11: Find order with associations ===');
    const foundOrder = await db.Order.findByPk(order.id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        },
        {
          model: db.OrderItem,
          as: 'items',
          include: [{
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'price']
          }]
        }
      ]
    });
    logger.info('Order with associations found:', JSON.stringify(foundOrder, null, 2));

    logger.info('\n=== Test 12: Test OrderItem calculateSubtotal method ===');
    const manualSubtotal = orderItem1.calculateSubtotal();
    logger.info('Manual subtotal calculation:', manualSubtotal);
    logger.info('Stored subtotal:', orderItem1.subtotal);

    logger.info('\n=== Test 13: Test order status validation ===');
    try {
      await db.Order.create({
        user_id: testUser.id,
        total_amount: 100,
        status: 'invalid_status'
      });
      logger.error('Test should have failed but did not!');
    } catch (error) {
      logger.info('Expected validation error caught');
    }

    logger.info('\n=== Test 14: Test with transaction (create order with items) ===');
    const transaction = await db.sequelize.transaction();
    try {
      const newOrder = await db.Order.create({
        user_id: testUser.id,
        total_amount: 100,
        status: 'pending'
      }, { transaction });

      await db.OrderItem.create({
        order_id: newOrder.id,
        product_id: product1.id,
        quantity: 1,
        unit_price: product1.price
      }, { transaction });

      await transaction.commit();
      logger.info('Transaction committed successfully, order ID:', newOrder.id);

      await db.Order.destroy({ where: { id: newOrder.id } });
    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction rolled back:', error.message);
    }

    logger.info('\n=== Test 15: Count orders and order items ===');
    const orderCount = await db.Order.count();
    const itemCount = await db.OrderItem.count();
    logger.info('Total orders:', orderCount);
    logger.info('Total order items:', itemCount);

    logger.info('\n=== Cleanup: Delete test data ===');
    await db.OrderItem.destroy({ where: { order_id: order.id } });
    await db.Order.destroy({ where: { id: order.id } });
    await db.Product.destroy({ where: { id: [product1.id, product2.id] } });
    await db.User.destroy({ where: { id: testUser.id } });
    logger.info('Test data deleted');

    logger.info('\n=== All tests completed successfully! ===');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

testOrderModels();
