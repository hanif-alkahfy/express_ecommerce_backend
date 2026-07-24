const { validateCartItems } = require('../../src/services/cartService');
const db = require('../../src/models');

jest.mock('../../src/models');

describe('Cart Validation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCartItems', () => {
    it('should return validated items with calculated totals', async () => {
      const mockProducts = [
        { id: 1, name: 'Game 1', price: 10.00, stock_quantity: 5, checkStock: jest.fn().mockReturnValue(true) },
        { id: 2, name: 'Game 2', price: 20.00, stock_quantity: 3, checkStock: jest.fn().mockReturnValue(true) }
      ];

      db.Product.findAll = jest.fn().mockResolvedValue(mockProducts);

      const cartItems = [
        { product_id: 1, quantity: 2 },
        { product_id: 2, quantity: 1 }
      ];

      const result = await validateCartItems(cartItems);

      expect(result.valid).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(40.00);
      expect(result.itemCount).toBe(2);
    });

    it('should throw error for empty cart', async () => {
      await expect(validateCartItems([]))
        .rejects.toThrow('Cart items must be a non-empty array');
    });

    it('should throw error for invalid product_id', async () => {
      await expect(validateCartItems([{ product_id: 'abc', quantity: 1 }]))
        .rejects.toThrow('valid product_id');
    });

    it('should throw error when product not found', async () => {
      db.Product.findAll = jest.fn().mockResolvedValue([
        { id: 1, name: 'Game 1', price: 10.00, stock_quantity: 5, checkStock: jest.fn().mockReturnValue(true) }
      ]);

      const cartItems = [
        { product_id: 1, quantity: 1 },
        { product_id: 999, quantity: 1 }
      ];

      await expect(validateCartItems(cartItems))
        .rejects.toThrow('Products not found');
    });

    it('should throw error for insufficient stock (fail fast)', async () => {
      const mockProducts = [
        { id: 1, name: 'Game 1', price: 10.00, stock_quantity: 2, checkStock: jest.fn().mockReturnValue(true) },
        { id: 2, name: 'Game 2', price: 20.00, stock_quantity: 1, checkStock: jest.fn().mockReturnValue(false) }
      ];

      db.Product.findAll = jest.fn().mockResolvedValue(mockProducts);

      const cartItems = [
        { product_id: 1, quantity: 1 },
        { product_id: 2, quantity: 5 }
      ];

      await expect(validateCartItems(cartItems))
        .rejects.toThrow('Insufficient stock');
    });

    it('should throw error for invalid quantity', async () => {
      const mockProducts = [
        { id: 1, name: 'Game 1', price: 10.00, stock_quantity: 5, checkStock: jest.fn().mockReturnValue(true) }
      ];

      db.Product.findAll = jest.fn().mockResolvedValue(mockProducts);

      const cartItems = [
        { product_id: 1, quantity: -1 }
      ];

      await expect(validateCartItems(cartItems))
        .rejects.toThrow('positive integer');
    });

    it('should throw error for non-integer quantity', async () => {
      const mockProducts = [
        { id: 1, name: 'Game 1', price: 10.00, stock_quantity: 5, checkStock: jest.fn().mockReturnValue(true) }
      ];

      db.Product.findAll = jest.fn().mockResolvedValue(mockProducts);

      const cartItems = [
        { product_id: 1, quantity: 1.5 }
      ];

      await expect(validateCartItems(cartItems))
        .rejects.toThrow('positive integer');
    });
  });
});
