import crypto from 'node:crypto';

export interface PaymentGatewayAdapter {
  createCheckoutSession(order: any, items: any[], origin: string): Promise<{ id: string; url: string }>;
  verifyWebhook(rawBody: string, signature: string, headers: Record<string, string>): Promise<{ success: boolean; orderId: string; status: 'paid' | 'failed'; transactionId?: string }>;
  refundOrder(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }>;
}

class StripeAdapter implements PaymentGatewayAdapter {
  private secretKey = process.env.STRIPE_SECRET_KEY || '';
  private webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  async createCheckoutSession(order: any, items: any[], origin: string): Promise<{ id: string; url: string }> {
    if (!this.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.label,
          description: `Variant: ${item.variantSku || 'Standard'}`,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents/paise
      },
      quantity: item.quantity,
    }));

    const bodyParams = new URLSearchParams();
    bodyParams.append('mode', 'payment');
    bodyParams.append('success_url', `${origin}/checkout/success?order_id=${order.id}`);
    bodyParams.append('cancel_url', `${origin}/checkout/cancel?order_id=${order.id}`);
    bodyParams.append('client_reference_id', order.id);
    bodyParams.append('customer_email', order.customer.email);

    lineItems.forEach((li, idx) => {
      bodyParams.append(`line_items[${idx}][price_data][currency]`, li.price_data.currency);
      bodyParams.append(`line_items[${idx}][price_data][product_data][name]`, li.price_data.product_data.name);
      bodyParams.append(`line_items[${idx}][price_data][product_data][description]`, li.price_data.product_data.description);
      bodyParams.append(`line_items[${idx}][price_data][unit_amount]`, String(li.price_data.unit_amount));
      bodyParams.append(`line_items[${idx}][quantity]`, String(li.quantity));
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Stripe Error: ${data.error?.message || JSON.stringify(data)}`);
    }

    return { id: data.id, url: data.url };
  }

  async verifyWebhook(rawBody: string, signature: string, headers: Record<string, string>): Promise<{ success: boolean; orderId: string; status: 'paid' | 'failed'; transactionId?: string }> {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    // Parse stripe-signature header: t=123,v1=abc
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const sigPart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !sigPart) {
      return { success: false, orderId: '', status: 'failed' };
    }

    const timestamp = timestampPart.split('=')[1];
    const stripeSig = sigPart.split('=')[1];

    const signedPayload = `${timestamp}.${rawBody}`;
    const computedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (computedSig !== stripeSig) {
      console.error('Stripe signature mismatch');
      return { success: false, orderId: '', status: 'failed' };
    }

    const event = JSON.parse(rawBody);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      return {
        success: true,
        orderId: session.client_reference_id || '',
        status: 'paid',
        transactionId: session.payment_intent || session.id
      };
    }

    return { success: false, orderId: '', status: 'failed' };
  }

  async refundOrder(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }> {
    if (!this.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    const bodyParams = new URLSearchParams();
    bodyParams.append('payment_intent', transactionId);
    bodyParams.append('amount', String(Math.round(amount * 100)));

    const res = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Stripe refund failed:', data.error);
      return { success: false };
    }

    return { success: true, refundId: data.id };
  }
}

class RazorpayAdapter implements PaymentGatewayAdapter {
  private keyId = process.env.RAZORPAY_KEY_ID || '';
  private keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  private webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  async createCheckoutSession(order: any, items: any[], origin: string): Promise<{ id: string; url: string }> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('RAZORPAY credentials are not set');
    }

    // Create a Razorpay Order first
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        receipt: order.id,
        notes: {
          customerName: order.customer.name,
          customerEmail: order.customer.email,
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Razorpay Error: ${data.error?.description || JSON.stringify(data)}`);
    }

    // Razorpay standard hosted page link is simulated or handled via custom template.
    // For standard Checkout flow, we return a redirect to a custom checkout page
    // that loads Razorpay Checkout modal with the order id
    const redirectUrl = `${origin}/checkout/razorpay-modal?order_id=${order.id}&razorpay_order_id=${data.id}&key=${this.keyId}&amount=${Math.round(order.totalAmount * 100)}`;
    return { id: data.id, url: redirectUrl };
  }

  async verifyWebhook(rawBody: string, signature: string, headers: Record<string, string>): Promise<{ success: boolean; orderId: string; status: 'paid' | 'failed'; transactionId?: string }> {
    if (!this.webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
    }

    const computedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (computedSig !== signature) {
      console.error('Razorpay webhook signature mismatch');
      return { success: false, orderId: '', status: 'failed' };
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'order.paid') {
      const payload = event.payload.order.entity;
      return {
        success: true,
        orderId: payload.receipt || '',
        status: 'paid',
        transactionId: payload.id
      };
    }

    return { success: false, orderId: '', status: 'failed' };
  }

  async refundOrder(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('RAZORPAY credentials are not set');
    }

    const res = await fetch(`https://api.razorpay.com/v1/payments/${transactionId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Razorpay refund failed:', data.error);
      return { success: false };
    }

    return { success: true, refundId: data.id };
  }
}

class MockAdapter implements PaymentGatewayAdapter {
  async createCheckoutSession(order: any, items: any[], origin: string): Promise<{ id: string; url: string }> {
    const redirectUrl = `${origin}/admin/checkout-mock?orderId=${order.id}`;
    return { id: `mock_sess_${Date.now()}`, url: redirectUrl };
  }

  async verifyWebhook(rawBody: string, signature: string, headers: Record<string, string>): Promise<{ success: boolean; orderId: string; status: 'paid' | 'failed'; transactionId?: string }> {
    const data = JSON.parse(rawBody);
    return {
      success: true,
      orderId: data.orderId || '',
      status: data.status || 'paid',
      transactionId: data.transactionId || `mock_tx_${Date.now()}`
    };
  }

  async refundOrder(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }> {
    console.log(`Mock refunding transaction ${transactionId} for amount ${amount}`);
    return { success: true, refundId: `mock_ref_${Date.now()}` };
  }
}

export function getPaymentGateway(): PaymentGatewayAdapter {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';
  if (provider === 'stripe') return new StripeAdapter();
  if (provider === 'razorpay') return new RazorpayAdapter();
  return new MockAdapter();
}
