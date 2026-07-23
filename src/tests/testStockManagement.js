const { Product } = require('../../src/models');
const { sequelize } = require('../../src/config/database');

describe('Stock Management Functions', () => {
  describe('Product.checkStockAvailability', () => {
    it('should return available true when stock is sufficient', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Game',
        stock_quantity: 10,
        checkStock: jest.fn().mockReturnValue(true)
      };

      Product.findByPk = jest.fn().mockResolvedValue(mockProduct);

      const result = await Product.checkStockAvailability(1, 5);

      expect(result.available).toBe(true);
      expect(result.availableQuantity).toBe(10);
      expect(Product.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should throw error when product not found', async () => {
      Product.findByPk = jest.fn().mockResolvedValue(null);

      await expect(Product.checkStockAvailability(999, 5))
        .rejects.toThrow('Product with ID 999 not found');
    });

    it('should throw error when insufficient stock', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Game',
        stock_quantity: 3,
        checkStock: jest.fn().mockReturnValue(false)
      };

      Product.findByPk = jest.fn().mockResolvedValue(mockProduct);

      await expect(Product.checkStockAvailability(1, 5))
        .rejects.toThrow('Insufficient stock for product Test Game');
    });
  });

  describe('Product.prototype.deductStock', () => {
    it('should deduct stock and increment version', async () => {
      const mockProduct = {
        id: 1,
        stock_quantity: 10,
        version: 0,
        update: jest.fn().mockResolvedValue([1]),
        reload: jest.fn().mockResolvedValue({
          id: 1,
          stock_quantity: 8,
          version: 1
        })
      };

      mockProduct.constructor = { update: jest.fn() };
      
      const result = await mockProduct.deductStock(2, null);

      expect(mockProduct.update).toHaveBeenCalled();
      expect(mockProduct.reload).toHaveBeenCalled();
    });

    it('should throw on optimistic lock conflict', async () => {
      const mockProduct = {
        id: 1,
        stock_quantity: 10,
        version: 0,
        update: jest.fn().mockResolvedValue([0]),
        reload: jest.fn()
      };

      mockProduct.constructor = { update: jest.fn() };

      await expect(mockProduct.deductStock(2, null))
        .rejects.toThrow('concurrent modification');
    });
  });

  describe('Product.prototype.restoreStock', () => {
    it('should restore stock and increment version', async () => {
      const mockProduct = {
        id: 1,
        stock_quantity: 5,
        version: 0,
        update: jest.fn().mockResolvedValue([1]),
        reload: jest.fn().mockResolvedValue({
          id: 1,
          stock_quantity: 7,
          version: 1
        })
      };

      mockProduct.constructor = { update: jest.fn() };
      
      const result = await mockProduct.restoreStock(2, null);

      expect(mockProduct.update).toHaveBeenCalled();
      expect(mockProduct.reload).toHaveBeenCalled();
    });

    it('should throw on optimistic lock conflict', async () => {
      const mockProduct = {
        id: 1,
        stock_quantity: 5,
        version: 0,
        update: jest.fn().mockResolvedValue([0]),
        reload: jest.fn()
      };

      mockProduct.constructor = { update: jest.fn() };

      await expect(mockProduct.restoreStock(2, null))
        .rejects.toThrow('concurrent modification');
    });
  });

  describe('Product.prototype.checkStock', () => {
    it('should return true when sufficient stock', () => {
      const product = { stock_quantity: 10 };
      const boundCheckStock = Product.prototype.checkStock.bind(product);
      
      expect(boundCheckStock(5)).toBe(true);
    });

    it('should return false when insufficient stock', () => {
      const product = { stock_quantity: 3 };
      const boundCheckStock = Product.prototype.checkStock.bind(product);
      
      expect(boundCheckStock(5)).toBe(false);
    });

    it('should throw for invalid quantity', () => {
      const product = { stock_quantity: 10 };
      const boundCheckStock = Product.prototype.checkStock.bind(product);
      
      expect(() => boundCheckStock(-1)).toThrow('positive number');
      expect(() => boundCheckStock('abc')).toThrow('positive number');
    });
  });
});
