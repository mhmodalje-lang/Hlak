import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { 
  ArrowRight, ArrowLeft, ShoppingBag, Star, Filter, Package,
  MessageCircle, Tag, Sparkles, ChevronLeft, ChevronRight, Store
} from 'lucide-react';

const ProductShowcase = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { API, gender, language } = useApp();
  const [products, setProducts] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      products: 'المنتجات',
      productShowcase: 'معرض المنتجات',
      allCategories: 'كل الفئات',
      styling: 'تصفيف',
      beard: 'لحية',
      shaving: 'حلاقة',
      hair_care: 'عناية بالشعر',
      skin_care: 'عناية بالبشرة',
      nails: 'أظافر',
      makeup: 'مكياج',
      general: 'عام',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      featured: 'مميز',
      noProducts: 'لا توجد منتجات حالياً',
      currency: '€',
      orderVia: 'اطلب عبر واتساب',
      visitShop: 'زيارة الصالون',
      shopProducts: 'منتجات الصالون',
      browseProducts: 'تصفح المنتجات المميزة',
      featuredProducts: 'منتجات مميزة',
      fromShop: 'من'
    },
    en: {
      back: 'Back',
      products: 'Products',
      productShowcase: 'Product Showcase',
      allCategories: 'All Categories',
      styling: 'Styling',
      beard: 'Beard',
      shaving: 'Shaving',
      hair_care: 'Hair Care',
      skin_care: 'Skin Care',
      nails: 'Nails',
      makeup: 'Makeup',
      general: 'General',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      featured: 'Featured',
      noProducts: 'No products available',
      currency: '€',
      orderVia: 'Order via WhatsApp',
      visitShop: 'Visit Shop',
      shopProducts: 'Shop Products',
      browseProducts: 'Browse Featured Products',
      featuredProducts: 'Featured Products',
      fromShop: 'from'
    }
  };

  const t = texts[language] || texts.ar;

  const categoryIcons = {
    styling: '💇',
    beard: '🧔',
    shaving: '🪒',
    hair_care: '🧴',
    skin_care: '✨',
    nails: '💅',
    makeup: '💄',
    general: '📦'
  };

  useEffect(() => {
    if (shopId) {
      fetchShopProducts();
      fetchShopInfo();
    } else {
      fetchFeaturedProducts();
    }
  }, [shopId, selectedCategory]);

  const fetchShopProducts = async () => {
    setIsLoading(true);
    try {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const res = await axios.get(`${API}/products/shop/${shopId}${params}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShopInfo = async () => {
    try {
      const res = await axios.get(`${API}/barbers/${shopId}`);
      setShopInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch shop info:', err);
    }
  };

  const fetchFeaturedProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/products/featured`);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch featured products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppOrder = (product) => {
    const phone = shopInfo?.whatsapp?.replace(/\D/g, '') || '';
    const message = language === 'ar' 
      ? `مرحباً، أريد طلب المنتج: ${product.name_ar} - السعر: ${product.price}€`
      : `Hi, I'd like to order: ${product.name} - Price: ${product.price}€`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getUniqueCategories = () => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats;
  };

  const defaultImage = isMen
    ? 'https://images.unsplash.com/photo-1673241073608-fae56d662d5b?w=400&h=400&fit=crop'
    : 'https://images.unsplash.com/photo-1695972235653-2d241f8cd412?w=400&h=400&fit=crop';

  return (
    <div className={`min-h-screen ${isMen ? 'bg-[#0A0A0A] text-white' : 'bg-[#FDFBF7] text-gray-900'}`} dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="product-showcase-page">
      
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1610595426075-eed5a3f521ee?w=1200&h=400&fit=crop)',
            opacity: isMen ? 0.4 : 0.3
          }}
        />
        <div className={`absolute inset-0 ${isMen ? 'bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent' : 'bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/70 to-transparent'}`} />
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} p-3 rounded-full backdrop-blur-xl z-10 ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-gray-900'}`}
          data-testid="back-btn"
        >
          {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        {/* Title */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShoppingBag className={`w-8 h-8 ${isMen ? 'text-yellow-500' : 'text-rose-400'}`} />
            <h1 className="text-3xl md:text-4xl font-black">
              {shopId ? t.shopProducts : t.featuredProducts}
            </h1>
          </div>
          {shopInfo && (
            <p className={`${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
              {language === 'ar' ? shopInfo.salon_name_ar : shopInfo.salon_name}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Category Filter */}
        {shopId && getUniqueCategories().length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide" data-testid="category-filter">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                selectedCategory === 'all'
                  ? (isMen ? 'bg-yellow-500 text-black' : 'bg-rose-400 text-white')
                  : (isMen ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
              }`}
            >
              {t.allCategories}
            </button>
            {getUniqueCategories().map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all flex items-center gap-2 ${
                  selectedCategory === cat
                    ? (isMen ? 'bg-yellow-500 text-black' : 'bg-rose-400 text-white')
                    : (isMen ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                }`}
              >
                <span>{categoryIcons[cat] || '📦'}</span>
                {t[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className={`w-12 h-12 border-4 rounded-full animate-spin ${isMen ? 'border-yellow-500 border-t-transparent' : 'border-rose-400 border-t-transparent'}`} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-xl font-bold ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>{t.noProducts}</p>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
            {products.map((product) => (
              <div 
                key={product.id}
                className={`group rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
                  isMen 
                    ? 'bg-[#141414] border-[#262626] hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/5' 
                    : 'bg-white border-gray-200 hover:border-rose-300 hover:shadow-xl'
                }`}
                data-testid={`product-card-${product.id}`}
              >
                {/* Product Image */}
                <div className="relative h-52 overflow-hidden">
                  <img 
                    src={product.image_url || defaultImage}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.src = defaultImage; }}
                  />
                  <div className={`absolute inset-0 ${isMen ? 'bg-gradient-to-t from-[#141414] to-transparent' : 'bg-gradient-to-t from-white/80 to-transparent'} opacity-60`} />
                  
                  {/* Badges */}
                  <div className={`absolute top-3 ${language === 'ar' ? 'right-3' : 'left-3'} flex flex-col gap-2`}>
                    {product.featured && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isMen ? 'bg-yellow-500/90 text-black' : 'bg-rose-400/90 text-white'}`}>
                        <Sparkles size={12} /> {t.featured}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.in_stock 
                        ? 'bg-green-500/90 text-white' 
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {product.in_stock ? t.inStock : t.outOfStock}
                    </span>
                  </div>

                  {/* Category badge */}
                  <div className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'}`}>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl ${isMen ? 'bg-black/50 text-gray-300' : 'bg-white/70 text-gray-600'}`}>
                      {categoryIcons[product.category] || '📦'} {t[product.category] || product.category}
                    </span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-5">
                  <h3 className="text-lg font-black mb-1 line-clamp-1">
                    {language === 'ar' ? product.name_ar : product.name}
                  </h3>
                  <p className={`text-sm mb-4 line-clamp-2 ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                    {language === 'ar' ? product.description_ar : product.description}
                  </p>

                  {/* Shop info for featured page */}
                  {!shopId && product.shop_name && (
                    <p className={`text-xs mb-3 flex items-center gap-1 ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
                      <Store size={12} /> {t.fromShop} {product.shop_name} • {product.shop_city}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-black ${isMen ? 'text-yellow-500' : 'text-rose-400'}`}>
                      {product.price} {t.currency}
                    </span>
                    
                    {shopInfo?.whatsapp && product.in_stock && (
                      <button
                        onClick={() => handleWhatsAppOrder(product)}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
                        data-testid={`order-btn-${product.id}`}
                      >
                        <MessageCircle size={16} /> {t.orderVia}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visit Shop Button */}
        {shopId && shopInfo && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate(`/barber/${shopId}`)}
              className={`px-8 py-3 rounded-2xl font-bold ${isMen ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-rose-400 text-white hover:bg-rose-500'}`}
              data-testid="visit-shop-btn"
            >
              <Store className="w-5 h-5 me-2" />
              {t.visitShop}
            </Button>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="fixed bottom-4 left-4 flex gap-2 z-[100] scale-75 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => navigate('/home')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
      </div>
    </div>
  );
};

export default ProductShowcase;
