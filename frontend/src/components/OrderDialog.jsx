import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { Store, Truck, Package as PackageIcon, Loader2, Check } from 'lucide-react';

const SHIPPING_META = {
  pickup: { icon: Store, key: 'pickup' },
  local_delivery: { icon: Truck, key: 'local_delivery' },
  courier: { icon: PackageIcon, key: 'courier' }
};

/**
 * OrderDialog - checkout modal for placing a product order.
 * Props: open, onOpenChange, product, shop, API, token, user, language, isMen
 */
const OrderDialog = ({ open, onOpenChange, product, shop, API, token, user, language, isMen }) => {
  const texts = {
    ar: {
      title: 'إتمام الطلب',
      product: 'المنتج',
      quantity: 'الكمية',
      shipping: 'طريقة الاستلام',
      pickup: 'استلام من الصالون',
      pickupDesc: 'تعال لاستلام الطلب من الصالون (مجاناً)',
      local_delivery: 'توصيل محلي',
      local_deliveryDesc: 'مندوب خاص إلى عنوانك',
      courier: 'شركة شحن',
      courierDesc: 'يتم التواصل معك لتنسيق الشحن',
      customer: 'معلوماتك',
      name: 'الاسم',
      phone: 'رقم الهاتف',
      address: 'العنوان',
      city: 'المدينة',
      country: 'الدولة',
      notes: 'ملاحظات (اختياري)',
      subtotal: 'المجموع الفرعي',
      shippingFee: 'رسوم التوصيل',
      total: 'الإجمالي',
      placeOrder: 'تأكيد الطلب',
      placing: 'جاري الحفظ...',
      success: 'تم تأكيد طلبك!',
      free: 'مجاناً',
      noMethods: 'لا توجد طرق استلام متاحة'
    },
    en: {
      title: 'Complete Order',
      product: 'Product',
      quantity: 'Quantity',
      shipping: 'Shipping Method',
      pickup: 'Pickup from Salon',
      pickupDesc: 'Collect your order from the salon (free)',
      local_delivery: 'Local Delivery',
      local_deliveryDesc: 'Courier to your address',
      courier: 'Shipping Company',
      courierDesc: 'Shop will contact you to arrange shipping',
      customer: 'Your Info',
      name: 'Full name',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      country: 'Country',
      notes: 'Notes (optional)',
      subtotal: 'Subtotal',
      shippingFee: 'Shipping fee',
      total: 'Total',
      placeOrder: 'Confirm Order',
      placing: 'Saving...',
      success: 'Your order is placed!',
      free: 'Free',
      noMethods: 'No shipping methods available'
    }
  };
  const t = texts[language] || texts.ar;

  const methods = useMemo(() => {
    const opts = product?.shipping_options && product.shipping_options.length > 0
      ? product.shipping_options
      : ['pickup'];
    return opts.filter(o => SHIPPING_META[o]);
  }, [product]);

  const [method, setMethod] = useState(methods[0] || 'pickup');
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({
    customer_name: user?.full_name || user?.name || '',
    customer_phone: user?.phone_number || user?.phone || '',
    shipping_address: '',
    shipping_city: '',
    shipping_country: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (methods.length && !methods.includes(method)) {
      setMethod(methods[0]);
    }
  }, [methods, method]);

  useEffect(() => {
    if (open) {
      setQty(1);
      setForm(prev => ({
        ...prev,
        customer_name: user?.full_name || user?.name || prev.customer_name,
        customer_phone: user?.phone_number || user?.phone || prev.customer_phone,
      }));
    }
  }, [open, user]);

  const unitPrice = product?.price || 0;
  const subtotal = unitPrice * qty;
  const shippingFee = method === 'local_delivery' ? (product?.local_delivery_fee || 0) : 0;
  const total = subtotal + shippingFee;

  const gold = isMen ? '#D4AF37' : '#B76E79';
  const bg = isMen ? 'bg-[#1A120A] border-[#3A2E1F] text-white' : 'bg-white text-gray-900';
  const cardBg = isMen ? 'bg-[#2A1F14] border-[#3A2E1F]' : 'bg-gray-50 border-gray-200';
  const inputClass = isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white placeholder:text-gray-500' : '';
  const mutedTxt = isMen ? 'text-gray-400' : 'text-gray-500';

  const handleSubmit = async () => {
    if (!form.customer_phone?.trim()) {
      toast.error(language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone is required');
      return;
    }
    if (method !== 'pickup' && !form.shipping_address?.trim()) {
      toast.error(language === 'ar' ? 'العنوان مطلوب للتوصيل' : 'Address is required for delivery');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        product_id: product.id,
        shop_id: product.shop_id || shop?.id,
        quantity: qty,
        shipping_method: method,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        shipping_address: form.shipping_address,
        shipping_city: form.shipping_city,
        shipping_country: form.shipping_country,
        notes: form.notes,
      };
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/orders`, payload, { headers });
      toast.success(t.success);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'حدث خطأ' : 'Error placing order'));
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${bg} max-w-md max-h-[90vh] overflow-y-auto`} data-testid="order-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon style={{ color: gold }} size={20} />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        {/* Product summary */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${cardBg}`}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${isMen ? 'bg-[#3A2E1F]' : 'bg-gray-200'}`}>
              <PackageIcon className={mutedTxt} size={22} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{language === 'ar' ? (product.name_ar || product.name) : product.name}</p>
            <p className="text-sm font-bold" style={{ color: gold }}>{unitPrice}€</p>
          </div>
          {/* Quantity stepper */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className={`w-7 h-7 rounded-full font-bold ${isMen ? 'bg-[#3A2E1F] text-white' : 'bg-gray-200 text-gray-900'}`}
              data-testid="qty-decrease"
            >−</button>
            <span className="w-6 text-center font-bold" data-testid="qty-value">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => q + 1)}
              className={`w-7 h-7 rounded-full font-bold ${isMen ? 'bg-[#3A2E1F] text-white' : 'bg-gray-200 text-gray-900'}`}
              data-testid="qty-increase"
            >+</button>
          </div>
        </div>

        {/* Shipping methods */}
        <div className="mt-4">
          <p className="text-sm font-bold mb-2">{t.shipping}</p>
          {methods.length === 0 ? (
            <p className={`text-sm ${mutedTxt}`}>{t.noMethods}</p>
          ) : (
            <div className="space-y-2">
              {methods.map(m => {
                const { icon: Icon } = SHIPPING_META[m];
                const active = method === m;
                const fee = m === 'local_delivery' ? (product?.local_delivery_fee || 0) : 0;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? (isMen ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#B76E79] bg-[#B76E79]/5')
                        : (isMen ? 'border-[#3A2E1F] bg-[#2A1F14]' : 'border-gray-200 bg-gray-50')
                    }`}
                    data-testid={`shipping-${m}`}
                  >
                    <Icon size={18} style={{ color: active ? gold : undefined }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{t[m]}</p>
                      <p className={`text-[11px] ${mutedTxt}`}>{t[`${m}Desc`]}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: active ? gold : undefined }}>
                      {fee > 0 ? `+${fee}€` : t.free}
                    </span>
                    {active && <Check size={16} style={{ color: gold }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold">{t.customer}</p>
          <Input
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            placeholder={t.name}
            className={inputClass}
            data-testid="order-name"
          />
          <Input
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            placeholder={t.phone}
            className={inputClass}
            data-testid="order-phone"
          />
          {method !== 'pickup' && (
            <>
              <Input
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                placeholder={t.address}
                className={inputClass}
                data-testid="order-address"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.shipping_city}
                  onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                  placeholder={t.city}
                  className={inputClass}
                />
                <Input
                  value={form.shipping_country}
                  onChange={(e) => setForm({ ...form, shipping_country: e.target.value })}
                  placeholder={t.country}
                  className={inputClass}
                />
              </div>
            </>
          )}
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t.notes}
            className={inputClass}
            data-testid="order-notes"
          />
        </div>

        {/* Summary */}
        <div className={`mt-4 p-3 rounded-xl border ${cardBg} space-y-1`}>
          <div className="flex justify-between text-sm">
            <span className={mutedTxt}>{t.subtotal}</span>
            <span className="font-bold">{subtotal.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={mutedTxt}>{t.shippingFee}</span>
            <span className="font-bold">{shippingFee > 0 ? `${shippingFee.toFixed(2)}€` : t.free}</span>
          </div>
          <div className="flex justify-between text-base border-t pt-2 mt-2" style={{ borderColor: isMen ? '#3A2E1F' : '#E5E7EB' }}>
            <span className="font-bold">{t.total}</span>
            <span className="font-bold" style={{ color: gold }} data-testid="order-total">{total.toFixed(2)}€</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || methods.length === 0}
          className={`w-full mt-4 ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
          data-testid="place-order-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Check className="w-4 h-4 me-2" />}
          {loading ? t.placing : t.placeOrder}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDialog;
