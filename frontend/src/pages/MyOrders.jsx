import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowRight, ArrowLeft, Package as PackageIcon, Clock, Check,
  Truck, Store, X, Loader2, ShoppingBag
} from 'lucide-react';

const STATUS_META = {
  pending:    { icon: Clock,    color: '#F59E0B', label_ar: 'بانتظار التأكيد', label_en: 'Pending' },
  confirmed:  { icon: Check,    color: '#3B82F6', label_ar: 'مؤكد',            label_en: 'Confirmed' },
  preparing:  { icon: PackageIcon, color: '#8B5CF6', label_ar: 'قيد التجهيز',   label_en: 'Preparing' },
  shipped:    { icon: Truck,    color: '#0EA5E9', label_ar: 'تم الشحن',        label_en: 'Shipped' },
  delivered:  { icon: Check,    color: '#10B981', label_ar: 'تم التسليم',      label_en: 'Delivered' },
  cancelled:  { icon: X,        color: '#EF4444', label_ar: 'ملغي',             label_en: 'Cancelled' },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const { API, token, language, gender, isAuthenticated, isUser } = useApp();
  const isMen = gender === 'male';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      title: 'طلباتي',
      back: 'رجوع',
      noOrders: 'لا توجد طلبات بعد',
      browseProducts: 'تصفح المنتجات',
      cancel: 'إلغاء',
      total: 'الإجمالي',
      quantity: 'الكمية',
      shipping: 'الاستلام',
      from: 'من',
      pickup: 'استلام من الصالون',
      local_delivery: 'توصيل محلي',
      courier: 'شركة شحن',
      loginRequired: 'يرجى تسجيل الدخول لعرض الطلبات',
      login: 'تسجيل الدخول',
      cancelled: 'تم إلغاء الطلب'
    },
    en: {
      title: 'My Orders',
      back: 'Back',
      noOrders: 'No orders yet',
      browseProducts: 'Browse Products',
      cancel: 'Cancel',
      total: 'Total',
      quantity: 'Qty',
      shipping: 'Shipping',
      from: 'from',
      pickup: 'Pickup',
      local_delivery: 'Local Delivery',
      courier: 'Shipping Company',
      loginRequired: 'Please login to view orders',
      login: 'Login',
      cancelled: 'Order cancelled'
    }
  }[language] || {};

  useEffect(() => {
    if (isAuthenticated && isUser) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isUser]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t.cancelled);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const gold = isMen ? '#D4AF37' : '#B76E79';
  const pageBg = isMen ? 'bg-[#0A0A0A] text-white' : 'bg-[#FDFBF7] text-gray-900';
  const cardBg = isMen ? 'bg-[#1A120A] border-[#3A2E1F]' : 'bg-white border-gray-200';
  const muted = isMen ? 'text-gray-400' : 'text-gray-500';

  if (!isAuthenticated || !isUser) {
    return (
      <div className={`min-h-screen ${pageBg} flex items-center justify-center px-4`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <PackageIcon className={`w-16 h-16 mx-auto mb-4 ${muted}`} />
          <p className="mb-4 text-lg">{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'} data-testid="login-btn">
            {t.login}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg}`} dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="my-orders-page">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full ${isMen ? 'bg-[#1A120A]' : 'bg-gray-100'}`} data-testid="back-btn">
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShoppingBag style={{ color: gold }} className="w-6 h-6" />
            {t.title}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: gold }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <PackageIcon className={`w-16 h-16 mx-auto mb-4 ${muted}`} />
            <p className="mb-4 text-lg font-bold">{t.noOrders}</p>
            <Button onClick={() => navigate('/products')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'} data-testid="browse-products-btn">
              {t.browseProducts}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const StatusIcon = meta.icon;
              const isCancellable = !['delivered', 'cancelled'].includes(order.status);
              return (
                <div key={order.id} className={`rounded-2xl border p-4 ${cardBg}`} data-testid={`order-card-${order.id}`}>
                  <div className="flex items-start gap-3">
                    {order.product_image ? (
                      <img src={order.product_image} alt={order.product_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${isMen ? 'bg-[#2A1F14]' : 'bg-gray-100'}`}>
                        <PackageIcon className={muted} size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold truncate">
                            {language === 'ar' ? (order.product_name_ar || order.product_name) : order.product_name}
                          </p>
                          <p className={`text-xs truncate ${muted}`}>
                            {t.from} {order.shop_name}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                        >
                          <StatusIcon size={12} />
                          {language === 'ar' ? meta.label_ar : meta.label_en}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span>{t.quantity}: <b>{order.quantity}</b></span>
                        <span>{t.shipping}: <b>{t[order.shipping_method] || order.shipping_method}</b></span>
                        <span>{t.total}: <b style={{ color: gold }}>{(order.total || 0).toFixed(2)}€</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {order.status_history && order.status_history.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${isMen ? 'border-[#3A2E1F]' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2 overflow-x-auto text-[11px]">
                        {order.status_history.map((h, i) => {
                          const hmeta = STATUS_META[h.status] || STATUS_META.pending;
                          return (
                            <div key={i} className="flex items-center gap-1 whitespace-nowrap">
                              <span style={{ color: hmeta.color }}>●</span>
                              <span className={muted}>{language === 'ar' ? hmeta.label_ar : hmeta.label_en}</span>
                              {i < order.status_history.length - 1 && <span className={muted}>→</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isCancellable && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-1"
                        data-testid={`cancel-order-${order.id}`}
                      >
                        <X size={14} /> {t.cancel}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
