const getPaymentSuccessTemplate = (data) => {
  const { 
    name, 
    orderId, 
    totalAmount, 
    items, 
    orderDate, 
    paymentMethod,
    shippingAddress 
  } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR' 
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}x</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="background: #27ae60; color: white; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px;">✓</div>
    </div>
    
    <h1 style="color: #27ae60; margin-bottom: 10px; text-align: center;">Payment Successful!</h1>
    <p style="text-align: center; color: #7f8c8d;">Thank you for your purchase</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2c3e50;">Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Order Date:</strong> ${formatDate(orderDate || new Date())}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod || 'QRIS'}</p>
      ${shippingAddress ? `<p><strong>Shipping Address:</strong><br>${shippingAddress}</p>` : ''}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #3498db; color: white;">
          <th style="padding: 12px; text-align: left;">Product</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Price</th>
          <th style="padding: 12px; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #27ae60;">${formatCurrency(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; color: #155724;"><strong>What's Next?</strong></p>
      <p style="margin: 10px 0 0 0; color: #155724;">Your order is being processed. You will receive another email with tracking information once your order ships.</p>
    </div>
  </div>
  <footer style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} E-Commerce. All rights reserved.</p>
  </footer>
</body>
</html>`;

  const itemsText = items.map(item => 
    `- ${item.name}: ${item.quantity}x @ ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}`
  ).join('\n');

  const text = `
Payment Successful!
==================

Thank you for your purchase, ${name || 'Customer'}!

ORDER DETAILS
-------------
Order ID: ${orderId}
Order Date: ${formatDate(orderDate || new Date())}
Payment Method: ${paymentMethod || 'QRIS'}
${shippingAddress ? `Shipping Address: ${shippingAddress}` : ''}

ITEMS PURCHASED
---------------
${itemsText}

TOTAL: ${formatCurrency(totalAmount)}

What's Next?
------------
Your order is being processed. You will receive another email with tracking information once your order ships.

© ${new Date().getFullYear()} E-Commerce. All rights reserved.
`;

  return { html, text, subject: `Payment Successful - Order #${orderId}` };
};

module.exports = { getPaymentSuccessTemplate };
