# 🌍 BARBER HUB - Smart Payment Gateway System
## نظام الدفع الذكي العالمي

---

## 🎯 Overview
The payment system automatically adapts based on the user's detected country, offering relevant payment methods for each region.

---

## 🗺️ **Payment Methods by Region**

### 🇸🇾 **Syria** (Auto-detected)
**Available Methods:**
1. **Cash on Delivery** ✅
   - Pay at the salon
   - No online payment required
   - Barber confirms payment after service

2. **SyriaTel Cash** 🟡 (Manual Transfer)
   - User transfers to barber's SyriaTel account
   - Upload receipt screenshot
   - Admin verifies payment

3. **MTN Cash** 🟡 (Manual Transfer)
   - User transfers to barber's MTN account
   - Upload receipt screenshot
   - Admin verifies payment

4. **Hawalas** 🟡 (Traditional Transfer)
   - Bank transfer instructions
   - Upload confirmation
   - Manual verification

**Implementation Status:**
- ✅ Cash on Delivery (Ready)
- 🟡 SyriaTel/MTN (UI ready, needs backend verification)
- 🟡 Hawalas (Documentation ready)

---

### 🇯🇴🇱🇧🇮🇶 **Jordan, Lebanon, Iraq**
**Available Methods:**
1. **Cash on Delivery** ✅
2. **Stripe** 🟡 (Visa/Mastercard)
3. **Local Bank Transfer** 🟡

---

### 🇸🇦🇦🇪🇰🇼🇶🇦🇧🇭🇴🇲 **GCC Countries**
**Available Methods:**
1. **Tap Payment** 🟡 (MENA specialist)
   - Visa/Mastercard
   - Apple Pay / mada
   - Local cards

2. **Cash on Delivery** ✅

3. **Stripe** 🟡 (Fallback)

---

### 🌍 **Rest of World**
**Available Methods:**
1. **Stripe** 🟡 (Primary)
   - Visa/Mastercard
   - Apple Pay / Google Pay
   - Local payment methods

2. **PayPal** 🟡 (Alternative)

3. **Cash** ✅ (Universal fallback)

---

## 🔧 **Technical Implementation**

### Smart Gateway Selector Logic:
```javascript
import { useGeoLocation } from '@/contexts/GeoLocationContext';

const PaymentGatewaySelector = ({ bookingId, amount }) => {
  const { country } = useGeoLocation();
  
  // Syria - Local methods only
  if (country === 'Syria') {
    return (
      <SyriaPaymentMethods 
        bookingId={bookingId} 
        amount={amount} 
      />
    );
  }
  
  // GCC - Tap Payment preferred
  if (['Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'].includes(country)) {
    return (
      <GCCPaymentMethods 
        bookingId={bookingId} 
        amount={amount} 
      />
    );
  }
  
  // Jordan, Lebanon, Iraq - Stripe + Cash
  if (['Jordan', 'Lebanon', 'Iraq'].includes(country)) {
    return (
      <MENAPaymentMethods 
        bookingId={bookingId} 
        amount={amount} 
      />
    );
  }
  
  // Rest of world - Stripe + PayPal
  return (
    <InternationalPaymentMethods 
      bookingId={bookingId} 
      amount={amount} 
    />
  );
};
```

---

## 📋 **Component Structure**

### Main Components:
1. **PaymentPage.jsx** - Main payment orchestrator
2. **SyriaPaymentMethods.jsx** - Syria-specific options
3. **GCCPaymentMethods.jsx** - Tap integration
4. **InternationalPaymentMethods.jsx** - Stripe/PayPal
5. **CashPayment.jsx** - Universal cash option
6. **ManualTransferUpload.jsx** - Receipt upload (Syria)

---

## 🇸🇾 **Syria Payment Flow**

### Cash on Delivery:
```
1. User selects "Cash"
2. Booking confirmed with status: "Pending Payment"
3. User goes to salon
4. Pays cash
5. Barber marks as "Paid" in dashboard
```

### SyriaTel/MTN Cash:
```
1. User selects "SyriaTel Cash" or "MTN Cash"
2. System shows transfer instructions:
   - Account Number: +963 XXX XXX XXX
   - Amount: 50,000 ليرة
   - Reference: BOOKING-12345
3. User transfers money via mobile app
4. User uploads receipt screenshot
5. Admin verifies payment
6. Booking status → "Paid"
```

---

## 💳 **Stripe Integration**

### Setup Requirements:
- Stripe Publishable Key
- Stripe Secret Key
- Webhook endpoint for payment confirmation

### Implementation:
```javascript
// frontend/src/components/StripeCheckout.jsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_KEY);

const StripeCheckout = ({ amount, bookingId }) => {
  const [clientSecret, setClientSecret] = useState('');
  
  useEffect(() => {
    // Create payment intent
    axios.post('/api/payments/stripe/create-intent', {
      amount,
      booking_id: bookingId
    }).then(res => setClientSecret(res.data.clientSecret));
  }, []);
  
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
      <button>Pay ${amount}</button>
    </Elements>
  );
};
```

---

## 🏦 **Backend API Endpoints**

### Required Endpoints:
```
POST /api/payments/cash
POST /api/payments/syria/upload-receipt
POST /api/payments/syria/verify (Admin only)
POST /api/payments/stripe/create-intent
POST /api/payments/stripe/webhook
POST /api/payments/tap/charge
POST /api/payments/paypal/create-order
GET  /api/payments/status/{booking_id}
```

---

## 🎨 **UI/UX Guidelines**

### Payment Method Cards:
- **Cash**: Green badge, simple icon
- **SyriaTel**: Yellow/orange with brand colors
- **MTN**: Blue with brand colors
- **Stripe**: Purple/blue modern cards
- **Tap**: Teal/green MENA vibes

### Design Consistency:
- All payment cards use Warm Luxury theme
- Glassmorphism backgrounds
- Gold accents for selected method
- Clear instructions in user's language

---

## 🔐 **Security & Compliance**

### PCI DSS Compliance:
- ✅ Never store card numbers
- ✅ Use Stripe.js for card tokenization
- ✅ HTTPS only
- ✅ Webhook signature verification

### Syria-Specific:
- Manual verification by admin
- Receipt uploads stored securely
- Transaction logs for auditing

---

## 📊 **Payment Success Flow**

```
User completes booking
    ↓
Redirected to PaymentPage
    ↓
System detects country (Syria)
    ↓
Shows Cash/SyriaTel/MTN options
    ↓
User selects "Cash"
    ↓
Booking status: "Confirmed - Cash on Delivery"
    ↓
Email/SMS confirmation sent
    ↓
User pays at salon
    ↓
Barber marks "Paid"
    ↓
Status: "Completed"
```

---

## 🚀 **Implementation Priority**

**Phase 1 (Now):** ✅ Done
- Cash on Delivery option
- Payment page structure
- Country detection

**Phase 2 (Next):** 🟡 In Progress
- Stripe integration
- Receipt upload UI
- Admin verification dashboard

**Phase 3 (Future):**
- Tap Payment (GCC)
- PayPal integration
- Automatic reconciliation

---

## 💡 **Fallback Strategy**

If payment gateway fails or is unavailable:
1. **Always offer Cash** as universal fallback
2. Show "Contact Support" option
3. Allow booking with "Payment Pending" status
4. Barber can manually confirm payment later

---

## 📞 **Support Per Region**

### Syria:
- WhatsApp support preferred
- Manual payment verification available
- 24-48 hour verification time

### International:
- Email support
- Live chat (future)
- Instant payment confirmation

---

**Last Updated:** 2026-04-19
**Status:** 🟡 Partial Implementation (Cash ready, Gateways pending API keys)
