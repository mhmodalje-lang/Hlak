/**
 * BARBER HUB - PortfolioManagement
 * Self-contained component for the Barber Dashboard.
 * Allows a salon to manage a 4-image Professional Portfolio (Hero gallery).
 *
 * Features:
 *  - 4 slot grid (2x2 on mobile, 4 cols on desktop)
 *  - Click empty slot -> file picker -> client-side resize (max 1200px) -> base64 -> POST
 *  - Hover/Tap on filled slot -> Delete (X) button
 *  - Optional caption per image
 *  - Max 4 images enforced client + server
 *  - Theme-aware (isMen ? gold : rose) to match existing dashboard styles
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Plus, Trash2, Loader2, Camera,
  Sparkles, Eye, X as XIcon, Info
} from 'lucide-react';

const MAX_IMAGES = 4;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (base64 ~= 2.7 MB)
const MAX_DIMENSION = 1200; // Max longest side in pixels

/**
 * Resize image file to max dimension and return a base64 data URL (JPEG, quality 0.85).
 * Smaller files are kept as-is but converted to data URL.
 */
const fileToResizedDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const PortfolioManagement = ({ API, token, isMen, language }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const fileInputRef = useRef(null);

  const isRTL = language === 'ar';
  const goldColor   = isMen ? '#D4AF37' : '#B76E79';
  const cardBgClass = isMen ? 'bg-[#2A1F14] border-[#3A2E1F]' : 'bg-[#FAFAFA] border-[#E7E5E4]';
  const textHi      = isMen ? 'text-white' : 'text-[#1C1917]';
  const textLo      = isMen ? 'text-[#94A3B8]' : 'text-[#57534E]';

  const t = isRTL ? {
    title: 'معرض الأعمال',
    subtitle: 'اعرض أفضل 4 أعمالك لجذب الزبائن النخبة',
    count: (n) => `${n}/${MAX_IMAGES} صور`,
    addImage: 'أضف صورة',
    replace: 'استبدال',
    delete: 'حذف',
    view: 'عرض',
    confirmDelete: 'حذف هذه الصورة؟',
    uploading: 'جاري الرفع...',
    success: 'تمت الإضافة بنجاح',
    deleted: 'تم الحذف',
    sizeErr: 'حجم الصورة كبير (الحد الأقصى 2MB)',
    typeErr: 'يرجى اختيار صورة فقط',
    maxErr: 'وصلت للحد الأقصى (4 صور). احذف واحدة للإضافة.',
    hint: '💡 استخدم صور عالية الجودة (JPG/PNG) لأفضل نتائج - التطبيق يضغطها تلقائياً',
    emptySlot: 'أضف صورة',
    slot: 'الخانة',
    error: 'خطأ في الرفع'
  } : {
    title: 'Work Portfolio',
    subtitle: 'Showcase your 4 best works to attract premium clients',
    count: (n) => `${n}/${MAX_IMAGES} photos`,
    addImage: 'Add Image',
    replace: 'Replace',
    delete: 'Delete',
    view: 'View',
    confirmDelete: 'Delete this image?',
    uploading: 'Uploading...',
    success: 'Image added successfully',
    deleted: 'Deleted',
    sizeErr: 'Image too large (max 2MB)',
    typeErr: 'Please select an image file',
    maxErr: 'Maximum 4 images reached. Delete one to add another.',
    hint: '💡 Use high-quality photos (JPG/PNG) for best results - auto-compressed',
    emptySlot: 'Add photo',
    slot: 'Slot',
    error: 'Upload failed'
  };

  // ---------- Fetch ----------
  const fetchGallery = async () => {
    setIsLoading(true);
    try {
      // Get current barber's shop id via the authenticated profile endpoint
      const profileRes = await axios.get(`${API}/barbers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const shopId = profileRes.data?.id;
      if (!shopId) { setImages([]); return; }
      const res = await axios.get(`${API}/barbershops/${shopId}/gallery`);
      setImages(res.data || []);
    } catch (err) {
      console.error('gallery fetch err', err);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGallery(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Upload ----------
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset input so same file can be re-selected later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t.typeErr);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(t.sizeErr);
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(t.maxErr);
      return;
    }

    setUploadingSlot(images.length); // the next empty slot

    try {
      const dataUrl = await fileToResizedDataURL(file);
      const res = await axios.post(
        `${API}/barbershops/me/gallery`,
        { image_after: dataUrl, image_before: '', caption: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newImg = res.data;
      setImages((prev) => [...prev, newImg]);
      toast.success(t.success);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || t.error;
      toast.error(msg);
    } finally {
      setUploadingSlot(null);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (imgId) => {
    if (!window.confirm(t.confirmDelete)) return;
    setDeletingId(imgId);
    try {
      await axios.delete(`${API}/barbershops/me/gallery/${imgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setImages((prev) => prev.filter((i) => i.id !== imgId));
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.error);
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- Render helpers ----------
  const openPicker = () => {
    if (images.length >= MAX_IMAGES) {
      toast.error(t.maxErr);
      return;
    }
    fileInputRef.current?.click();
  };

  // Build 4 slot array (fill with existing images, then empty placeholders)
  const slots = Array.from({ length: MAX_IMAGES }, (_, i) => images[i] || null);

  return (
    <div className={`${cardBgClass} border p-5 mb-8 rounded-2xl`} data-testid="portfolio-management">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="portfolio-file-input"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className={`font-bold flex items-center gap-2 ${textHi}`}>
          <Camera className="w-5 h-5" style={{ color: goldColor }} />
          {t.title}
        </h3>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: `${goldColor}20`, color: goldColor, border: `1px solid ${goldColor}40` }}
        >
          {t.count(images.length)}
        </span>
      </div>
      <p className={`text-xs mb-3 ${textLo}`}>{t.subtitle}</p>

      {/* Hint */}
      <div className={`flex items-start gap-2 p-2 rounded-lg mb-4 text-[11px] ${textLo}`}
           style={{ backgroundColor: `${goldColor}0F`, border: `1px solid ${goldColor}25` }}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: goldColor }} />
        <span>{t.hint}</span>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: goldColor }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {slots.map((img, idx) => {
            const isUploading = uploadingSlot === idx;
            const isDeleting = img && deletingId === img.id;
            const heroUrl = img?.after || img?.image_after || img?.before || img?.image_before;

            return (
              <div
                key={img?.id || `empty-${idx}`}
                className="relative aspect-square rounded-xl overflow-hidden group"
                data-testid={`portfolio-slot-${idx}`}
              >
                {img && heroUrl ? (
                  // ---- Filled slot ----
                  <>
                    <img
                      src={heroUrl}
                      alt={`Work ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Top gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Slot number */}
                    <div
                      className="absolute top-2 start-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: goldColor, color: isMen ? '#000' : '#fff' }}
                    >
                      {idx + 1}
                    </div>

                    {/* Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setLightboxImg(heroUrl)}
                        className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#1C1917] flex items-center justify-center shadow-lg"
                        aria-label={t.view}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={isDeleting}
                        className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg disabled:opacity-50"
                        aria-label={t.delete}
                        data-testid={`delete-slot-${idx}`}
                      >
                        {isDeleting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>

                    {/* Mobile: always show delete button */}
                    <div className="md:hidden absolute top-2 end-2">
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-lg"
                        aria-label={t.delete}
                      >
                        {isDeleting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <XIcon className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </>
                ) : isUploading ? (
                  // ---- Uploading state ----
                  <div
                    className="w-full h-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: `${goldColor}15`, border: `2px dashed ${goldColor}` }}
                  >
                    <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: goldColor }} />
                    <span className={`text-xs ${textLo}`}>{t.uploading}</span>
                  </div>
                ) : (
                  // ---- Empty slot ----
                  <button
                    type="button"
                    onClick={openPicker}
                    className={`w-full h-full flex flex-col items-center justify-center transition-all group-hover:scale-[1.02] ${isMen ? 'bg-[#1a1109]' : 'bg-white'}`}
                    style={{ border: `2px dashed ${goldColor}55` }}
                    data-testid={`upload-slot-${idx}`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${goldColor}20` }}
                    >
                      <Plus className="w-6 h-6" style={{ color: goldColor }} />
                    </div>
                    <span className={`text-xs font-bold ${textHi}`}>{t.emptySlot}</span>
                    <span className={`text-[10px] ${textLo}`}>{t.slot} {idx + 1}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Primary CTA (only when not full) */}
      {!isLoading && images.length < MAX_IMAGES && images.length > 0 && (
        <button
          type="button"
          onClick={openPicker}
          className="w-full mt-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: `linear-gradient(135deg, ${goldColor}, ${goldColor}CC)`,
            color: isMen ? '#000' : '#fff'
          }}
          data-testid="add-more-btn"
        >
          <Sparkles className="w-4 h-4" />
          {t.addImage}
        </button>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            data-testid="portfolio-lightbox"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImg}
              alt="Full view"
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-sm"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortfolioManagement;
