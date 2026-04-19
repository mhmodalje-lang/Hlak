import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Package as PackageIcon, Clock, Check, Truck, Store, X, 
  MessageCircle, Phone, MapPin, ShoppingBag, ChevronDown, ChevronUp
} from 'lucide-react';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

const STATUS_META = {
  pending:    { color: '#F59E0B', label_ar: 'بانتظار',   label_en: 'Pending',   icon: Clock },
  confirmed:  { color: '#3B82F6', label_ar: 'مؤكد',      label_en: 'Confirmed', icon: Check },
  preparing:  { color: '#8B5CF6', label_ar: 'تجهيز',     label_en: 'Preparing', icon: PackageIcon },
  shipped:    { color: '#0EA5E9', label_ar: 'تم الشحن',  label_en: 'Shipped',   icon: Truck },
  delivered:  { color: '#10B981', label_ar: 'تم التسليم', label_en: 'Delivered', icon: Check },
  cancelled:  { color: '#EF4444', label_ar: 'ملغي',       label_en: 'Cancelled', icon: X },
};

const SHIPPING_LABELS = {
  pickup:         { ar: 'استلام من الصالون', en: 'Pickup' },
  local_delivery: { ar: 'توصيل محلي',        en: 'Local Delivery' },
  courier:        { ar: 'شركة شحن',          en: 'Shipping Company' },
};

/**
 * ShopOrdersManagement - Barber dashboard card for managing incoming orders
 * Props: API, token, isMen, language
 */
const ShopOrdersManagement = ({ API, token, isMen, language }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState('active'); // active | all | specific status

  const t = {
    ar: {
      title: 'طلبات المنتجات',
      filter: 'تصنيف',
      active: 'نشط',
      all: 'الكل',
      noOrders: 'لا توجد طلبات',
      quantity: 'الكمية',
      total: 'الإجمالي',
      shipping: 'الاستلام',
      address: 'العنوان',
      callCustomer: 'اتصال',
      whatsappCustomer: 'واتساب',
      updateStatus: 'تغيير الحالة',
      notes: 'ملاحظات'
    },
    en: {
      title: 'Product Orders',
      filter: 'Filter',
      active: 'Active',
      all: 'All',
      noOrders: 'No orders',
      quantity: 'Qty',
      total: 'Total',
      shipping: 'Shipping',
      address: 'Address',
      callCustomer: 'Call',
      whatsappCustomer: 'WhatsApp',
      updateStatus: 'Update status',
      notes: 'Notes'
    }
  }[language] || {};

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/shop`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch shop orders:', err);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const gold = isMen ? '#D4AF37' : '#B76E79';

  const filtered = orders.filter(o => {
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`} data-testid="shop-orders-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <ShoppingBag className="w-5 h-5" style={{ color: gold }} />
          {t.title} ({activeCount})
        </h3>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className={`w-32 h-8 text-xs ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}`} data-testid="orders-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t.active}</SelectItem>
              <SelectItem value="all">{t.all}</SelectItem>
              {ORDER_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {language === 'ar' ? STATUS_META[s].label_ar : STATUS_META[s].label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1.5 rounded-lg ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {loading ? (
            <div className="text-center py-6 text-sm opacity-60">...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6">
              <PackageIcon className={`w-10 h-10 mx-auto mb-2 ${isMen ? 'text-[#3A2E1F]' : 'text-gray-300'}`} />
              <p className={`text-sm ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>{t.noOrders}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => {
                const meta = STATUS_META[order.status] || STATUS_META.pending;
                const StatusIcon = meta.icon;
                const phone = (order.customer_phone || '').replace(/\D/g, '');
                return (
                  <div
                    key={order.id}
                    className={`p-3 rounded-xl border ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F]' : 'bg-gray-50 border-gray-200'}`}
                    data-testid={`shop-order-${order.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {order.product_image ? (
                        <img src={order.product_image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isMen ? 'bg-[#3A2E1F]' : 'bg-gray-200'}`}>
                          <PackageIcon size={18} className={isMen ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">
                              {language === 'ar' ? (order.product_name_ar || order.product_name) : order.product_name}
                            </p>
                            <p className={`text-[11px] ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                              {order.customer_name || '—'} • {order.customer_phone}
                            </p>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                          >
                            <StatusIcon size={10} />
                            {language === 'ar' ? meta.label_ar : meta.label_en}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          <span>×<b>{order.quantity}</b></span>
                          <span>{t.shipping}: <b>{SHIPPING_LABELS[order.shipping_method]?.[language] || order.shipping_method}</b></span>
                          <span style={{ color: gold }} className="font-bold">{(order.total || 0).toFixed(2)}€</span>
                        </div>

                        {order.shipping_method !== 'pickup' && order.shipping_address && (
                          <p className={`mt-1 text-[11px] flex items-center gap-1 ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                            <MapPin size={10} /> {order.shipping_address}{order.shipping_city ? `, ${order.shipping_city}` : ''}
                          </p>
                        )}
                        {order.notes && (
                          <p className={`mt-1 text-[11px] ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t.notes}: {order.notes}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {phone && (
                            <>
                              <a
                                href={`tel:${order.customer_phone}`}
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${isMen ? 'bg-[#3A2E1F] text-white hover:bg-[#4A3A28]' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                              >
                                <Phone size={11} /> {t.callCustomer}
                              </a>
                              <a
                                href={`https://wa.me/${phone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-green-600 hover:bg-green-500 text-white"
                              >
                                <MessageCircle size={11} /> {t.whatsappCustomer}
                              </a>
                            </>
                          )}
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className={`h-7 text-[11px] ${isMen ? 'bg-[#3A2E1F] border-[#3A2E1F] text-white' : ''}`} data-testid={`status-select-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map(s => (
                                <SelectItem key={s} value={s}>
                                  {language === 'ar' ? STATUS_META[s].label_ar : STATUS_META[s].label_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShopOrdersManagement;
