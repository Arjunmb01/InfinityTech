import User from '../../models/userSchema.js';
import Product from '../../models/productSchema.js';
import Cart from '../../models/cartSchema.js';
import Address from '../../models/addressSchema.js';
import Order from '../../models/orderSchema.js';
import Coupon from '../../models/coupounSchema.js';
import Wallet from '../../models/walletSchema.js';
import * as emailService from '../../services/emailService.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';

import { getBestOfferForProduct } from '../../utils/offer.js';

const razorpay = new Razorpay({
  key_id: process.env.Test_Key_ID,
  key_secret: process.env.Test_Key_Secret,
});

export const renderCheckout = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const [cart, userAddress, coupons] = await Promise.all([
      Cart.findOne({ userId }).populate('items.productId'),
      Address.findOne({ userID: userId }),
      Coupon.find({ isList: true, expiryDate: { $gt: new Date() } }),
    ]);

    const addresses = userAddress ? userAddress.address : [];

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    // Check stock for all items
    for (const item of cart.items) {
      if (!item.productId || item.productId.quantity < item.quantity) {
        req.flash('error', `Some items in your cart are out of stock: ${item.productId ? item.productId.name : 'Unknown Product'}`);
        return res.redirect('/cart');
      }
    }

    const wallet = await Wallet.findOne({ userId });

    // Calculate Totals for View
    let subtotal = 0;
    const cartItemsWithOffers = await Promise.all(cart.items.map(async (item) => {
      const offerDetails = await getBestOfferForProduct(item.productId);
      const itemTotal = offerDetails.finalPrice * item.quantity;
      subtotal += itemTotal;
      return {
        product: {
          _id: item.productId._id,
          name: item.productId.name,
          images: item.productId.images,
        },
        quantity: item.quantity,
        total: itemTotal,
        offerDetails: offerDetails
      };
    }));

    const shippingCharge = subtotal > 1000 ? 0 : 100;
    const totalAmount = subtotal + shippingCharge;

    res.render('checkout', {
      cart,
      cartItemsWithOffers,
      subtotal,
      shippingCharge,
      totalAmount,
      addresses,
      defaultAddressIndex: addresses.findIndex(a => a.isDefault) !== -1 ? addresses.findIndex(a => a.isDefault) : 0,
      coupons,
      walletBalance: wallet ? wallet.balance : 0,
      messages: req.flash(),
      user: req.session.user
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.redirect('/cart');
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { couponCode, subtotal } = req.body;
    const userId = req.session.user._id;

    const coupon = await Coupon.findOne({ name: couponCode, isList: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    if (new Date() > coupon.expiryDate) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (subtotal < coupon.minimumPrice) {
      return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPrice} required` });
    }

    const orderCount = await Order.countDocuments({ userId, couponCode: coupon.name });
    if (orderCount > 0) {
      return res.status(400).json({ success: false, message: 'Coupon already used' });
    }

    const discountAmount = Math.min(coupon.offerPrice, subtotal);
    const finalTotal = subtotal - discountAmount;

    res.json({
      success: true,
      discount: discountAmount,
      discountedTotal: finalTotal,
      couponCode: coupon.name,
      message: 'Coupon applied successfully',
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const initiateCheckout = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (item.productId.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `${item.productId.name} is out of stock` });
      }
      
      const offerDetails = await getBestOfferForProduct(item.productId);
      const itemFinalPrice = offerDetails.finalPrice;
      const itemTotal = itemFinalPrice * item.quantity;
      
      subtotal += itemTotal;
      orderItems.push({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price, // Original price
        finalPrice: itemFinalPrice,  // After product/category offers
        totalPrice: itemTotal        // Final total for this item
      });
    }

    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isList: true });
      if (coupon && subtotal >= coupon.minimumPrice && new Date() <= coupon.expiryDate) {
        discountAmount = coupon.offerPrice;
      }
    }

    const shippingCharge = subtotal > 1000 ? 0 : 100;
    const finalAmount = subtotal - discountAmount + shippingCharge;

    if (paymentMethod === 'cod' && finalAmount > 1000) {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is only available for orders below ₹1000' });
    }

    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < finalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
      return handleWalletOrder(req, res, { userId, addressId, orderItems, finalAmount, couponCode, shippingCharge });
    }

    if (paymentMethod === 'cod') {
      return handleCODOrder(req, res, { userId, addressId, orderItems, finalAmount, couponCode, shippingCharge });
    }

    // Razorpay handled via createRazorpayOrder route
    res.status(400).json({ success: false, message: 'Invalid payment method for this endpoint' });
  } catch (error) {
    console.error('Initiate checkout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

async function handleCODOrder(req, res, orderData) {
  const userAddress = await Address.findOne({ userID: orderData.userId });
  const deliveryAddress = userAddress.address.id(orderData.addressId);

  const order = new Order({
    userId: orderData.userId,
    products: orderData.orderItems,
    orderAmount: orderData.finalAmount, // Added to satisfy schema
    totalAmount: orderData.finalAmount,
    deliveryAddress: deliveryAddress.toObject(), // Store full address object
    shippingCharge: orderData.shippingCharge,
    paymentMethod: 'cod',
    status: 'Placed',
    paymentStatus: 'pending',
    couponCode: orderData.couponCode,
  });

  await order.save();
  await updateInventoryAndClearCart(orderData.userId, orderData.orderItems);
  
  const user = await User.findById(orderData.userId);
  sendOrderConfirmationEmail(user.email, order);

  res.json({ 
    success: true, 
    message: 'Order placed successfully', 
    orderId: order._id,
    redirectUrl: `/order-success?id=${order._id}`
  });
}

async function handleWalletOrder(req, res, orderData) {
  const wallet = await Wallet.findOne({ userId: orderData.userId });
  wallet.balance -= orderData.finalAmount;
  wallet.transactions.push({
    amount: orderData.finalAmount,
    type: 'debit',
    description: 'Order Payment',
    date: new Date(),
  });
  await wallet.save();

  const userAddress = await Address.findOne({ userID: orderData.userId });
  const deliveryAddress = userAddress.address.id(orderData.addressId);

  const order = new Order({
    userId: orderData.userId,
    products: orderData.orderItems,
    orderAmount: orderData.finalAmount, // Added to satisfy schema
    totalAmount: orderData.finalAmount,
    deliveryAddress: deliveryAddress.toObject(), // Store full address object
    shippingCharge: orderData.shippingCharge,
    paymentMethod: 'wallet',
    status: 'Placed',
    paymentStatus: 'paid',
    couponCode: orderData.couponCode,
  });

  await order.save();
  await updateInventoryAndClearCart(orderData.userId, orderData.orderItems);

  const user = await User.findById(orderData.userId);
  sendOrderConfirmationEmail(user.email, order);

  res.json({ 
    success: true, 
    message: 'Order placed successfully using wallet', 
    orderId: order._id,
    redirectUrl: `/order-success?id=${order._id}`
  });
}

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ 
      success: true, 
      orderId: order.id,
      amount: order.amount,
      key: process.env.Test_Key_ID,
      order 
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ success: false, message: 'Could not create Razorpay order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    
    if (!orderData) {
      return res.status(400).json({ success: false, message: 'Missing order data for verification' });
    }

    const hmac = crypto.createHmac('sha256', process.env.Test_Key_Secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log(`Payment signature verified for order: ${razorpay_order_id}`);
      
      const userAddress = await Address.findOne({ userID: req.session.user._id });
      const deliveryAddress = userAddress.address.id(orderData.addressId);

      // Map frontend items to Order schema structure
      const mappedProducts = orderData.orderItems.map(item => ({
        productId: item.product._id,
        quantity: item.quantity,
        price: item.total / item.quantity, // Estimate original price if not sent
        finalPrice: item.total / item.quantity,
        totalPrice: item.total
      }));

      const order = new Order({
        userId: req.session.user._id,
        products: mappedProducts,
        orderAmount: orderData.totalAmount, // Added to satisfy schema
        totalAmount: orderData.totalAmount,
        deliveryAddress: deliveryAddress.toObject(),
        shippingCharge: orderData.shippingCharge,
        paymentMethod: 'razorpay',
        status: 'Placed',
        paymentStatus: 'paid',
        razorpayDetails: { // Corrected structure
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature
        },
        couponCode: orderData.couponCode,
      });

      try {
        await order.save();
        await updateInventoryAndClearCart(req.session.user._id, mappedProducts);

        const user = await User.findById(req.session.user._id);
        sendOrderConfirmationEmail(user.email, order);

        res.json({ 
          success: true, 
          message: 'Payment verified and order placed', 
          orderId: order._id,
          redirectUrl: `/order-success?id=${order._id}` 
        });
      } catch (saveError) {
        console.error('Error saving order after payment verification:', saveError);
        res.status(500).json({ success: false, message: 'Payment verified but failed to create order' });
      }
    } else {
      console.error(`Signature mismatch for order ${razorpay_order_id}. Expected: ${generated_signature}, Received: ${razorpay_signature}`);
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

export const savePendingOrder = async (req, res) => {
    try {
        const { addressId, orderItems, totalAmount, couponCode, shippingCharge } = req.body;
        const userId = req.session.user._id;

        const userAddress = await Address.findOne({ userID: userId });
        const deliveryAddress = userAddress.address.id(addressId);

        const order = new Order({
            userId,
            products: orderItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                finalPrice: item.finalPrice,
                totalPrice: item.totalPrice
            })),
            orderAmount: totalAmount,
            totalAmount: totalAmount,
            deliveryAddress: deliveryAddress.toObject(),
            shippingCharge: shippingCharge || 0,
            paymentMethod: 'razorpay', // Usually pending online payment
            status: 'Pending',
            paymentStatus: 'pending',
            couponCode
        });

        await order.save();
        res.json({ success: true, orderId: order._id });
    } catch (error) {
        console.error('Save pending order error:', error);
        res.status(500).json({ success: false, message: 'Failed to save pending order' });
    }
};

export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.paymentStatus = 'paid'; // Lowercase to match enum
        await order.save();
        await updateInventoryAndClearCart(order.userId, order.products); // Fixed orderItems -> products

        const user = await User.findById(order.userId);
        sendOrderConfirmationEmail(user.email, order);

        res.json({ success: true, message: 'Payment completed successfully' });
    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to update payment status' });
    }
};

async function updateInventoryAndClearCart(userId, orderItems) {
  for (const item of orderItems) {
    const productId = item.productId || (item.product ? item.product._id : null);
    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -item.quantity, salesCount: item.quantity },
      });
    }
  }
  await Cart.findOneAndDelete({ userId });
}

async function sendOrderConfirmationEmail(email, order) {
  const result = await emailService.sendOrderConfirmationEmail(email, order);
  if (!result.success) {
    console.error('Failed to send order confirmation email:', result.message);
  }
}

export const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user._id;

        const order = await Order.findOne({ _id: orderId, userId }).populate('products.productId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        doc.pipe(res);

        // --- Helper Functions ---
        const generateHr = (y) => {
            doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
        };

        const formatCurrency = (amount) => {
            return "INR " + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        };

        // --- Header ---
        doc.fillColor("#444444").fontSize(20).text("INFINITY TECH", 50, 57, { bold: true });
        doc.fontSize(10).text("Precision Performance Hardware", 50, 80);
        doc.fontSize(10).text("123 Tech Avenue, Silicon Valley", 50, 95);
        doc.text("Bangalore, KA 560001", 50, 110);
        doc.text("Phone: +91 80 1234 5678", 50, 125);
        
        doc.fontSize(25).text("INVOICE", 400, 57, { align: "right" });
        doc.fontSize(10).text(`Order #: ${order._id.toString().toUpperCase()}`, 400, 90, { align: "right" });
        doc.text(`Date: ${new Date(order.orderDate || order.createdAt).toLocaleDateString()}`, 400, 105, { align: "right" });
        doc.text(`Status: ${order.paymentStatus.toUpperCase()}`, 400, 120, { align: "right" });
        
        doc.moveDown();
        generateHr(150);

        // --- Bill To ---
        doc.fontSize(12).text("BILL TO:", 50, 170, { bold: true });
        doc.fontSize(10).text(order.deliveryAddress.name, 50, 190, { width: 250 });
        doc.text(order.deliveryAddress.address || order.deliveryAddress.street || "", 50, 205, { width: 250 });
        doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`, 50, 220, { width: 250 });
        doc.text(`Phone: ${order.deliveryAddress.phone}`, 50, 235, { width: 250 });

        // --- Payment Details ---
        doc.fontSize(12).text("PAYMENT METHOD:", 350, 170, { bold: true, width: 200, align: "right" });
        doc.fontSize(10).text(order.paymentMethod.toUpperCase(), 350, 190, { width: 200, align: "right" });
        if (order.razorpayDetails && order.razorpayDetails.paymentId) {
            doc.text(`Payment ID: ${order.razorpayDetails.paymentId}`, 350, 205, { width: 200, align: "right" });
        }

        doc.moveDown();
        
        // --- Table Header ---
        const tableTop = 270;
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Item Details", 50, tableTop, { width: 200 });
        doc.text("Unit Price", 280, tableTop, { width: 90, align: "right" });
        doc.text("Qty", 370, tableTop, { width: 50, align: "right" });
        doc.text("Subtotal", 440, tableTop, { width: 110, align: "right" });
        doc.moveDown();
        generateHr(tableTop + 15);
        doc.font("Helvetica");

        // --- Table Items ---
        let currentY = tableTop + 25;
        order.products.forEach((item, index) => {
            const productName = item.productId ? item.productId.name : "Unknown Hardware Component";
            const unitPrice = item.price;
            const quantity = item.quantity;
            const subtotal = item.totalPrice;

            // Handle long product names with careful wrapping
            const nameHeight = doc.heightOfString(productName, { width: 200 });
            
            doc.fontSize(10).text(productName, 50, currentY, { width: 200 });
            doc.text(unitPrice.toLocaleString('en-IN'), 280, currentY, { width: 90, align: "right" });
            doc.text(quantity.toString(), 370, currentY, { width: 50, align: "right" });
            doc.text(subtotal.toLocaleString('en-IN'), 440, currentY, { width: 110, align: "right" });

            currentY += Math.max(25, nameHeight + 10);
            
            if (currentY > 700) { // Pagination (simplified)
                doc.addPage();
                currentY = 50;
            }
        });

        generateHr(currentY + 5);

        // --- Summary Section ---
        const summaryY = currentY + 20;
        const summaryLabelX = 350;
        const summaryValueX = 440;

        doc.fontSize(10).text("Subtotal:", summaryLabelX, summaryY, { width: 90, align: "right" });
        doc.text(order.products.reduce((acc, p) => acc + p.totalPrice, 0).toLocaleString('en-IN'), summaryValueX, summaryY, { width: 110, align: "right" });

        doc.text("Discount:", summaryLabelX, summaryY + 20, { width: 90, align: "right" });
        doc.text(`- ${ (order.couponDiscount || 0).toLocaleString('en-IN') }`, summaryValueX, summaryY + 20, { width: 110, align: "right" });

        doc.text("Shipping:", summaryLabelX, summaryY + 40, { width: 90, align: "right" });
        doc.text((order.shippingCharge || 0) === 0 ? "FREE" : order.shippingCharge.toLocaleString('en-IN'), summaryValueX, summaryY + 40, { width: 110, align: "right" });

        doc.font("Helvetica-Bold").fontSize(12);
        doc.text("GRAND TOTAL:", summaryLabelX, summaryY + 70, { width: 120, align: "right" });
        doc.text(formatCurrency(order.totalAmount || order.orderAmount), summaryValueX, summaryY + 70, { width: 110, align: "right" });

        // --- Footer ---
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#777777")
            .text("Thank you for choosing InfinityTech. For support, contact support@infinitytech.com", 50, 750, { align: "center", width: 500 });

        doc.end();
    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(500).json({ success: false, message: 'Error generating invoice' });
    }
};

export const showOrderSuccess = async (req, res) => {
  try {
    const orderId = req.query.id;
    if (!orderId) return res.redirect('/orders');

    const order = await Order.findById(orderId).populate('products.productId');
    if (!order) return res.redirect('/orders');

    res.render('user/orderSuccess', {
      order,
      user: req.session.user,
      title: 'Order Successful | InfinityTech'
    });
  } catch (error) {
    console.error('Show order success error:', error);
    res.redirect('/orders');
  }
};
