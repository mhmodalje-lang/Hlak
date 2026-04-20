/**
 * BARBER HUB - ImageUploader (v3.7)
 * File-based image picker that:
 *   1. Accepts camera / gallery on mobile (capture="environment").
 *   2. Resizes + JPEG-compresses client-side (max 1280px long edge) so the
 *      final base64 payload stays well under the backend 5MB limit.
 *   3. Produces a data: URL string suitable for POST /api/products, gallery
 *      images, and shop logos.
 *   4. Has full-width preview + remove button + drag/drop zone desktop.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_MAX_EDGE = 1280;   // px
const DEFAULT_QUALITY = 0.82;    // JPEG quality

async function compressToDataURL(file, maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxEdge || height > maxEdge) {
    const ratio = Math.min(maxEdge / width, maxEdge / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  // Prefer JPEG — smallest payload. Fall back to PNG if alpha matters (rare for shops).
  return canvas.toDataURL('image/jpeg', quality);
}

const ImageUploader = ({
  value,
  onChange,
  label = 'Upload image',
  helpText = '',
  aspect = 'square',   // 'square' | 'wide' | 'free'
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_QUALITY,
  language = 'ar',
  disabled = false,
  testId,
}) => {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isRTL = language === 'ar';

  const aspectClass = aspect === 'wide' ? 'aspect-[16/9]' : aspect === 'free' ? 'min-h-[140px]' : 'aspect-square';

  const handleFiles = useCallback(async (files) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'الرجاء اختيار صورة' : 'Please choose an image');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الصورة كبير جداً (12MB كحد أقصى)' : 'Image too large (12MB max)');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressToDataURL(file, maxEdge, quality);
      onChange?.(dataUrl);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل معالجة الصورة' : 'Failed to process image');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }, [language, maxEdge, quality, onChange]);

  const onPick = () => fileRef.current?.click();

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
      {label && (
        <label className="block text-sm mb-1" style={{ color: 'var(--bh-text-secondary, rgba(255,255,255,0.75))' }}>
          {label}
        </label>
      )}
      {value ? (
        <div className={`relative ${aspectClass} rounded-xl overflow-hidden group`} style={{
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
        }}>
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange?.('')}
              className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-500 text-white rounded-full p-1.5 transition-transform hover:scale-105"
              aria-label="remove"
              data-testid={testId ? `${testId}-remove` : undefined}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={onPick}
              className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white rounded-full px-3 py-1.5 text-xs font-semibold"
              data-testid={testId ? `${testId}-change` : undefined}
            >
              {language === 'ar' ? 'تغيير' : 'Change'}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={onPick}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`w-full ${aspectClass} rounded-xl flex flex-col items-center justify-center gap-2 transition-all bh-touch`}
          style={{
            border: `2px dashed ${dragOver ? 'rgba(212,175,55,0.75)' : 'rgba(212,175,55,0.35)'}`,
            background: dragOver
              ? 'linear-gradient(180deg, rgba(212,175,55,0.10), rgba(212,175,55,0.04))'
              : 'linear-gradient(180deg, rgba(30,22,14,0.55), rgba(20,14,10,0.55))',
            color: 'rgba(255,255,255,0.75)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          data-testid={testId}
        >
          {busy ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">{language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" style={{ color: '#D4AF37' }} />
                <ImageIcon className="w-5 h-5" style={{ color: '#D4AF37' }} />
                <Upload className="w-5 h-5" style={{ color: '#D4AF37' }} />
              </div>
              <span className="text-sm font-semibold">
                {language === 'ar' ? 'اختر صورة أو التقط صورة' : 'Pick or capture a photo'}
              </span>
              {helpText && <span className="text-[11px] opacity-70 px-4 text-center">{helpText}</span>}
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;
export { compressToDataURL };
