import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { ServicesManagement, SocialMediaManagement } from '@/components/DashboardExtras';
import PortfolioManagement from '@/components/PortfolioManagement';
import UsageStats from '@/components/UsageStats';
import ShopOrdersManagement from '@/components/ShopOrdersManagement';
import SponsoredAdsManagement from '@/components/SponsoredAdsManagement';
import RevenueStats from '@/components/RevenueStats';
import LeaveManagement from '@/components/LeaveManagement';
import { 
  ArrowRight, ArrowLeft, Calendar, Clock, Star, 
  Check, X, Loader2, Settings, QrCode, Users,
  DollarSign, BarChart, Crown, ShoppingBag, Plus, Trash2, Edit, Package
} from 'lucide-react';

const BarberDashboard = () => {
  const navigate = useNavigate();
  const { API, gender, user, token, language, themeClass, isAuthenticated, isBarber } = useApp();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    price: '', category: 'general', image_url: '', featured: false,
    shipping_options: ['pickup'], local_delivery_fee: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      bookings: 'الحجوزات',
      stats: 'الإحصائيات',
      editProfile: 'تعديل الملف',
      qrCode: 'رمز QR',
      todayBookings: 'حجوزات اليوم',
      totalBookings: 'إجمالي الحجوزات',
      rating: 'التقييم',
      reviews: 'التقييمات',
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      confirm: 'تأكيد',
      complete: 'إتمام',
      noBookings: 'لا توجد حجوزات',
      subscription: 'الاشتراك',
      subscriptionInactive: 'غير مفعل',
      subscriptionActive: 'مفعل',
      activateNow: 'فعّل الآن',
      setupProfile: 'إعداد الملف الشخصي',
      noProfile: 'لم يتم إنشاء الملف الشخصي بعد',
      loginRequired: 'يرجى تسجيل الدخول كحلاق',
      products: 'المنتجات',
      addProduct: 'إضافة منتج',
      editProduct: 'تعديل المنتج',
      productName: 'اسم المنتج',
      productNameAr: 'اسم المنتج بالعربي',
      productDesc: 'وصف المنتج',
      productDescAr: 'وصف بالعربي',
      productPrice: 'السعر',
      productCategory: 'الفئة',
      productImage: 'رابط الصورة',
      productFeatured: 'منتج مميز',
      save: 'حفظ',
      delete: 'حذف',
      noProducts: 'لا توجد منتجات بعد',
      shippingTitle: 'خيارات الاستلام',
      pickup: 'استلام من الصالون',
      local_delivery: 'توصيل محلي (مندوب خاص)',
      courier: 'شركة شحن',
      deliveryFee: 'رسوم التوصيل المحلي (€)',
      maxProductsReached: 'الحد الأقصى 10 منتجات'
    },
    en: {
      dashboard: 'Dashboard',
      profile: 'Profile',
      bookings: 'Bookings',
      stats: 'Statistics',
      editProfile: 'Edit Profile',
      qrCode: 'QR Code',
      todayBookings: "Today's Bookings",
      totalBookings: 'Total Bookings',
      rating: 'Rating',
      reviews: 'Reviews',
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      confirm: 'Confirm',
      complete: 'Complete',
      noBookings: 'No bookings',
      subscription: 'Subscription',
      subscriptionInactive: 'Inactive',
      subscriptionActive: 'Active',
      activateNow: 'Activate Now',
      setupProfile: 'Setup Profile',
      noProfile: 'Profile not created yet',
      loginRequired: 'Please login as barber',
      products: 'Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      productName: 'Product Name',
      productNameAr: 'Name (Arabic)',
      productDesc: 'Description',
      productDescAr: 'Description (Arabic)',
      productPrice: 'Price',
      productCategory: 'Category',
      productImage: 'Image URL',
      productFeatured: 'Featured Product',
      save: 'Save',
      delete: 'Delete',
      noProducts: 'No products yet',
      shippingTitle: 'Shipping Options',
      pickup: 'Pickup from Salon',
      local_delivery: 'Local Delivery (Courier)',
      courier: 'Shipping Company',
      deliveryFee: 'Local Delivery Fee (€)',
      maxProductsReached: 'Maximum 10 products reached'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    if (isAuthenticated && isBarber) {
      fetchProfile();
      fetchBookings();
      fetchProducts();
    }
  }, [isAuthenticated, isBarber]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/barbers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) {
      toast.error(language === 'ar' ? 'الاسم والسعر مطلوبان' : 'Name and price are required');
      return;
    }
    try {
      const payload = { ...productForm, price: parseFloat(productForm.price) };
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? 'تم تحديث المنتج' : 'Product updated');
      } else {
        await axios.post(`${API}/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? 'تم إضافة المنتج' : 'Product added');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: '', name_ar: '', description: '', description_ar: '', price: '', category: 'general', image_url: '', featured: false });
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name, name_ar: product.name_ar || '',
      description: product.description || '', description_ar: product.description_ar || '',
      price: product.price.toString(), category: product.category,
      image_url: product.image_url || '', featured: product.featured,
      shipping_options: product.shipping_options && product.shipping_options.length > 0 ? product.shipping_options : ['pickup'],
      local_delivery_fee: product.local_delivery_fee || 0
    });
    setShowProductForm(true);
  };

  if (!isAuthenticated || !isBarber) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`mb-4 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center px-4`}>
        <div className="text-center">
          <Settings className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <p className={`mb-4 text-xl ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.noProfile}</p>
          <Button onClick={() => navigate('/profile-setup')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {t.setupProfile}
          </Button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="barber-dashboard">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            >
              {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {t.dashboard}
            </h1>
          </div>
          <Button onClick={() => navigate('/profile-setup')} variant="outline" size="sm">
            <Settings className="w-4 h-4 me-2" />
            {t.editProfile}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Calendar className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {todayBookings.length}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.todayBookings}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Users className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.total_bookings}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.totalBookings}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Star className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.rating?.toFixed(1) || '0.0'}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.rating}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <BarChart className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.total_reviews}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.reviews}</p>
          </div>
        </div>

        {/* Subscription Status */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className={`w-6 h-6 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              <div>
                <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.subscription}</p>
                <p className={user?.subscription_status === 'active' ? 'text-green-500' : 'text-yellow-500'}>
                  {user?.subscription_status === 'active' ? t.subscriptionActive : t.subscriptionInactive}
                </p>
              </div>
            </div>
            {user?.subscription_status !== 'active' && (
              <Button onClick={() => navigate('/payment')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
                {t.activateNow}
              </Button>
            )}
          </div>
        </div>

        {/* QR Code */}
        {profile.qr_code && (
          <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <QrCode className="w-5 h-5" />
              {t.qrCode}
            </h3>
            <div className="flex justify-center">
              <div className="qr-container">
                <img src={`data:image/png;base64,${profile.qr_code}`} alt="QR Code" className="w-32 h-32" />
              </div>
            </div>
            <p className={`text-center mt-2 text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {language === 'ar' ? 'اطبعه وضعه على باب الصالون' : 'Print and place at your salon door'}
            </p>
          </div>
        )}

        {/* Products Management */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <ShoppingBag className={`w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              {t.products} ({products.length}/10)
            </h3>
            <Button 
              onClick={() => { 
                if (products.length >= 10) { toast.error(t.maxProductsReached); return; }
                setEditingProduct(null); 
                setProductForm({ name: '', name_ar: '', description: '', description_ar: '', price: '', category: 'general', image_url: '', featured: false, shipping_options: ['pickup'], local_delivery_fee: 0 }); 
                setShowProductForm(true); 
              }}
              size="sm" className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
              data-testid="add-product-btn"
              disabled={products.length >= 10}
            >
              <Plus className="w-4 h-4 me-1" /> {t.addProduct}
            </Button>
          </div>
          
          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${isMen ? 'bg-[#3A2E1F]' : 'bg-[#E7E5E4]'}`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className={`w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />

        {/* AI Usage Stats */}
        <UsageStats API={API} token={token} isMen={isMen} language={language} />

        {/* Products Management */}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                        {language === 'ar' ? product.name_ar : product.name}
                        {product.featured && <span className={`ms-2 text-[10px] px-2 py-0.5 rounded-full ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>★</span>}
                      </p>
                      <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{product.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{product.price}€</span>
                    <button onClick={() => openEditProduct(product)} className={`p-1.5 rounded-lg ${isMen ? 'hover:bg-[#3A2E1F] text-[#94A3B8]' : 'hover:bg-[#E7E5E4] text-[#57534E]'}`}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Package className={`w-10 h-10 mx-auto mb-2 ${isMen ? 'text-[#3A2E1F]' : 'text-[#E7E5E4]'}`} />
              <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.noProducts}</p>
            </div>
          )}
        </div>

        {/* Bookings Tabs */}
        <PortfolioManagement API={API} token={token} isMen={isMen} language={language} />
        <RevenueStats API={API} token={token} isMen={isMen} language={language} />
        <ShopOrdersManagement API={API} token={token} isMen={isMen} language={language} />
        <SponsoredAdsManagement API={API} token={token} isMen={isMen} language={language} />
        <LeaveManagement API={API} token={token} isMen={isMen} language={language} />
        <ServicesManagement API={API} token={token} isMen={isMen} language={language} />
        <SocialMediaManagement API={API} token={token} isMen={isMen} language={language} profile={profile} onUpdate={() => window.location.reload()} />

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 mb-4 ${isMen ? 'bg-[#2A1F14]' : 'bg-[#F5F5F4]'}`}>
            <TabsTrigger value="pending" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {t.pending} ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {t.confirmed} ({confirmedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="today" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {language === 'ar' ? 'اليوم' : 'Today'} ({todayBookings.length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'confirmed', 'today'].map((tab) => {
            const filteredBookings = tab === 'today' ? todayBookings : bookings.filter(b => b.status === tab);
            return (
              <TabsContent key={tab} value={tab}>
                {filteredBookings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <div key={booking.id} className={`${isMen ? 'card-men' : 'card-women'} p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                              {booking.customer_name}
                            </p>
                            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                              {booking.customer_phone}
                            </p>
                          </div>
                          <div className="text-end">
                            <p className={isMen ? 'text-white' : 'text-[#1C1917]'}>{booking.date}</p>
                            <p className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{booking.time}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {booking.services?.map((s, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded ${isMen ? 'bg-[#3A2E1F] text-white' : 'bg-[#E7E5E4] text-[#1C1917]'}`}>
                              {language === 'ar' ? s.name_ar : s.name}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {booking.status === 'pending' && (
                            <Button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              size="sm"
                              className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
                            >
                              <Check className="w-4 h-4 me-1" />
                              {t.confirm}
                            </Button>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 me-1" />
                              {t.complete}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className={`w-12 h-12 mx-auto mb-2 ${isMen ? 'text-[#3A2E1F]' : 'text-[#E7E5E4]'}`} />
                    <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.noBookings}</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className={`${isMen ? 'bg-[#1A120A] border-[#3A2E1F] text-white' : 'bg-white'} max-w-md`}>
          <DialogHeader>
            <DialogTitle>{editingProduct ? t.editProduct : t.addProduct}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-2">
            <div>
              <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productName}</label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                placeholder="Product name"
                className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}
                data-testid="product-name-input"
              />
            </div>
            <div>
              <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productNameAr}</label>
              <Input
                value={productForm.name_ar}
                onChange={(e) => setProductForm({...productForm, name_ar: e.target.value})}
                placeholder="اسم المنتج"
                dir="rtl"
                className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productPrice} (€)</label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  placeholder="0"
                  className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}
                  data-testid="product-price-input"
                />
              </div>
              <div>
                <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productCategory}</label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm({...productForm, category: v})}>
                  <SelectTrigger className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="styling">Styling</SelectItem>
                    <SelectItem value="beard">Beard</SelectItem>
                    <SelectItem value="shaving">Shaving</SelectItem>
                    <SelectItem value="hair_care">Hair Care</SelectItem>
                    <SelectItem value="skin_care">Skin Care</SelectItem>
                    <SelectItem value="nails">Nails</SelectItem>
                    <SelectItem value="makeup">Makeup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productDesc}</label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                placeholder="Product description"
                className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}
              />
            </div>
            <div>
              <label className={`text-sm font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productImage}</label>
              <Input
                value={productForm.image_url}
                onChange={(e) => setProductForm({...productForm, image_url: e.target.value})}
                placeholder="https://..."
                className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={productForm.featured}
                onChange={(e) => setProductForm({...productForm, featured: e.target.checked})}
                className="w-4 h-4"
                data-testid="product-featured-checkbox"
              />
              <label className={`text-sm font-bold ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.productFeatured}</label>
            </div>

            {/* Shipping Options */}
            <div className={`p-3 rounded-xl border ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F]' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.shippingTitle}</p>
              <div className="space-y-2">
                {['pickup', 'local_delivery', 'courier'].map((opt) => {
                  const checked = productForm.shipping_options?.includes(opt);
                  return (
                    <label key={opt} className={`flex items-center gap-2 text-sm cursor-pointer ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={!!checked}
                        onChange={(e) => {
                          const current = productForm.shipping_options || [];
                          const next = e.target.checked ? [...current, opt] : current.filter(x => x !== opt);
                          setProductForm({ ...productForm, shipping_options: next.length > 0 ? next : ['pickup'] });
                        }}
                        data-testid={`shipping-opt-${opt}`}
                      />
                      {t[opt]}
                    </label>
                  );
                })}
              </div>
              {productForm.shipping_options?.includes('local_delivery') && (
                <div className="mt-3">
                  <label className={`text-xs font-bold mb-1 block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.deliveryFee}</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={productForm.local_delivery_fee}
                    onChange={(e) => setProductForm({ ...productForm, local_delivery_fee: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className={isMen ? 'bg-[#3A2E1F] border-[#3A2E1F] text-white' : ''}
                    data-testid="local-delivery-fee-input"
                  />
                </div>
              )}
            </div>
            <Button 
              onClick={handleSaveProduct} 
              className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              data-testid="save-product-btn"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BarberDashboard;
