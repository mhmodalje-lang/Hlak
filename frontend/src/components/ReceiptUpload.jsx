/**
 * ReceiptUpload — reusable modal/section to submit a manual-payment receipt.
 * Used by PaymentPage and BookingPage.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - API: backend base
 *  - amount: number (USD)
 *  - currency: string
 *  - methodId: string (from /api/payment-methods)
 *  - methodName: string
 *  - targetType: 'booking' | 'subscription' | 'order'
 *  - targetId: string | null
 *  - onSubmitted: (receipt) => void
 *  - token: optional JWT (guest also supported)
 *  - defaultPayerName, defaultPayerPhone
 */
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, X, Loader2, Check } from 'lucide-react';

const ReceiptUpload = ({
  open, onClose, API, amount, currency = 'USD',
  methodId, methodName, targetType, targetId, onSubmitted,
  token, defaultPayerName = '', defaultPayerPhone = '', language = 'ar',
}) => {
  const isRTL = language === 'ar';
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [payerName, setPayerName] = useState(defaultPayerName);
  const [payerPhone, setPayerPhone] = useState(defaultPayerPhone);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = isRTL ? {
    title: 'رفع إيصال الدفع',
    subtitle: 'الرجاء رفع صورة الإيصال بعد إتمام التحويل.',
    uploadImage: 'اختر صورة الإيصال',
    payerName: 'اسم الدافع',
    payerPhone: 'هاتف الدافع',
    notes: 'ملاحظات (اختياري)',
    submit: 'إرسال الإيصال',
    cancel: 'إلغاء',
    success: 'تم رفع الإيصال. سيتم تأكيد الدفع من الإدارة خلال 24 ساعة.',
    imageRequired: 'الرجاء اختيار صورة الإيصال أولاً',
    tooLarge: 'الصورة كبيرة جداً. الحد الأقصى 3 ميغابايت.',
    amount: 'المبلغ',
    method: 'طريقة الدفع',
  } : {
    title: 'Upload Payment Receipt',
    subtitle: 'Please upload a photo of your payment receipt.',
    uploadImage: 'Pick receipt image',
    payerName: 'Payer name',
    payerPhone: 'Payer phone',
    notes: 'Notes (optional)',
    submit: 'Submit receipt',
    cancel: 'Cancel',
    success: 'Receipt uploaded. Admin will verify within 24 hours.',
    imageRequired: 'Please pick a receipt image first.',
    tooLarge: 'Image too large. Max 3 MB.',
    amount: 'Amount',
    method: 'Method',
  };

  if (!open) return null;

  const pick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error(t.tooLarge); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!image) { toast.error(t.imageRequired); return; }
    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API}/payment-receipts`, {
        amount: Number(amount) || 0,
        currency,
        method_id: methodId || null,
        method_name: methodName || '',
        receipt_image: image,
        target_type: targetType,
        target_id: targetId || null,
        notes: notes || null,
        payer_name: payerName || null,
        payer_phone: payerPhone || null,
      }, { headers });
      toast.success(t.success);
      if (onSubmitted) onSubmitted(res.data);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4" data-testid="receipt-upload-modal" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-t-3xl md:rounded-3xl border border-yellow-500/30 w-full max-w-md p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 end-4 text-gray-400 hover:text-white" data-testid="receipt-modal-close">
          <X className="w-5 h-5"/>
        </button>

        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-yellow-400"/> {t.title}
        </h2>
        <p className="text-xs text-gray-400 mb-4">{t.subtitle}</p>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-400">{t.amount}</span><span className="font-bold text-yellow-300">{amount} {currency}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.method}</span><span className="font-bold text-white">{methodName || '-'}</span></div>
        </div>

        <div className="space-y-3">
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" onChange={pick} className="hidden" data-testid="receipt-file-input"/>
            <div className="border-2 border-dashed border-gray-700 hover:border-yellow-500 rounded-2xl p-4 text-center transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="receipt" className="max-h-44 mx-auto rounded-lg"/>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2"/>
                  <p className="text-sm text-gray-300">{t.uploadImage}</p>
                  <p className="text-[10px] text-gray-500">JPG/PNG · &lt; 3MB</p>
                </>
              )}
            </div>
          </label>

          <input value={payerName} onChange={e => setPayerName(e.target.value)} placeholder={t.payerName} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white" data-testid="receipt-payer-name"/>
          <input value={payerPhone} onChange={e => setPayerPhone(e.target.value)} placeholder={t.payerPhone} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white" data-testid="receipt-payer-phone"/>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.notes} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white resize-none"/>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={submitting || !image} className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="receipt-submit-btn">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            {t.submit}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUpload;
