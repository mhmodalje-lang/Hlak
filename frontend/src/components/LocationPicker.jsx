import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, Crosshair, Loader2, ExternalLink } from 'lucide-react';

/**
 * LocationPicker - Hyper-local mapping widget for barbers.
 * Captures GPS + manual district / neighborhood / village (for unmapped areas).
 *
 * Props: value, onChange, language, isMen
 * value: { latitude, longitude, district, neighborhood, village, address }
 */
const LocationPicker = ({ value = {}, onChange, language = 'ar', isMen = true }) => {
  const [capturing, setCapturing] = useState(false);

  const t = {
    ar: {
      title: 'الموقع الجغرافي',
      subtitle: 'حدد موقع الصالون بدقة لعرضك للزبائن حولك',
      useGps: 'استخدم موقعي الحالي',
      capturing: 'جاري التحديد...',
      lat: 'خط العرض',
      lng: 'خط الطول',
      district: 'الناحية / المنطقة',
      neighborhood: 'الحي',
      village: 'القرية / البلدة',
      address: 'العنوان التفصيلي',
      gpsSuccess: 'تم تحديد موقعك',
      gpsError: 'تعذر الوصول للموقع. يرجى السماح بصلاحية الموقع أو الإدخال يدوياً',
      notSupported: 'المتصفح لا يدعم تحديد الموقع',
      openMap: 'عرض على الخريطة',
      hint: 'نصيحة: إذا كنت في قرية غير مسجلة، اكتب اسمها يدوياً وسيظهر لزبائنك'
    },
    en: {
      title: 'Location',
      subtitle: 'Pin your salon location to appear to nearby customers',
      useGps: 'Use my current location',
      capturing: 'Capturing...',
      lat: 'Latitude',
      lng: 'Longitude',
      district: 'District / Area',
      neighborhood: 'Neighborhood',
      village: 'Village / Town',
      address: 'Detailed Address',
      gpsSuccess: 'Location captured',
      gpsError: 'Could not access location. Please allow permission or enter manually',
      notSupported: 'Geolocation not supported',
      openMap: 'View on map',
      hint: 'Tip: if your village is not on maps, write its name manually — customers will still find you'
    }
  }[language] || {};

  const set = (patch) => onChange({ ...value, ...patch });

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error(t.notSupported);
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        });
        toast.success(t.gpsSuccess);
        setCapturing(false);
      },
      (err) => {
        console.error('GPS error:', err);
        toast.error(t.gpsError);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const inputClass = isMen
    ? 'bg-[#2A1F14] border-[#3A2E1F] text-white placeholder:text-[#94A3B8]'
    : 'bg-white border-[#E7E5E4] text-[#1C1917] placeholder:text-[#57534E]';
  const labelClass = isMen ? 'text-[#94A3B8]' : 'text-[#57534E]';
  const gold = isMen ? '#D4AF37' : '#B76E79';
  const { latitude, longitude } = value;
  const hasGps = latitude && longitude;
  const mapUrl = hasGps ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  return (
    <div className={`${isMen ? 'card-men' : 'card-women'} p-6`} data-testid="location-picker">
      <div className="flex items-center gap-2 mb-1">
        <MapPin style={{ color: gold }} className="w-5 h-5" />
        <h2 className={`text-lg font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.title}</h2>
      </div>
      <p className={`text-xs mb-4 ${labelClass}`}>{t.subtitle}</p>

      {/* GPS capture button */}
      <div className={`p-3 rounded-xl border mb-4 ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F]' : 'bg-[#FAFAFA] border-gray-200'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            {hasGps ? (
              <div className="text-xs">
                <span className={labelClass}>GPS:</span>{' '}
                <span className="font-mono font-bold" style={{ color: gold }}>
                  {latitude}, {longitude}
                </span>
                {mapUrl && (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="ms-2 inline-flex items-center gap-1 text-xs hover:underline" style={{ color: gold }}>
                    <ExternalLink size={11} /> {t.openMap}
                  </a>
                )}
              </div>
            ) : (
              <p className={`text-xs ${labelClass}`}>{t.hint}</p>
            )}
          </div>
          <Button
            type="button"
            onClick={captureGPS}
            disabled={capturing}
            size="sm"
            className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
            data-testid="gps-capture-btn"
          >
            {capturing ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Crosshair className="w-4 h-4 me-2" />}
            {capturing ? t.capturing : t.useGps}
          </Button>
        </div>
      </div>

      {/* Coordinates (editable for manual override) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className={labelClass}>{t.lat}</Label>
          <Input
            type="number"
            step="0.000001"
            value={latitude ?? ''}
            onChange={(e) => set({ latitude: e.target.value === '' ? null : parseFloat(e.target.value) })}
            placeholder="33.5138"
            className={inputClass}
            data-testid="gps-latitude"
          />
        </div>
        <div>
          <Label className={labelClass}>{t.lng}</Label>
          <Input
            type="number"
            step="0.000001"
            value={longitude ?? ''}
            onChange={(e) => set({ longitude: e.target.value === '' ? null : parseFloat(e.target.value) })}
            placeholder="36.2765"
            className={inputClass}
            data-testid="gps-longitude"
          />
        </div>
      </div>

      {/* Area hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <Label className={labelClass}>{t.district}</Label>
          <Input
            value={value.district || ''}
            onChange={(e) => set({ district: e.target.value })}
            className={inputClass}
            data-testid="loc-district"
          />
        </div>
        <div>
          <Label className={labelClass}>{t.neighborhood}</Label>
          <Input
            value={value.neighborhood || ''}
            onChange={(e) => set({ neighborhood: e.target.value })}
            className={inputClass}
            data-testid="loc-neighborhood"
          />
        </div>
        <div>
          <Label className={labelClass}>{t.village}</Label>
          <Input
            value={value.village || ''}
            onChange={(e) => set({ village: e.target.value })}
            className={inputClass}
            data-testid="loc-village"
          />
        </div>
      </div>

      <div>
        <Label className={labelClass}>{t.address}</Label>
        <Input
          value={value.address || ''}
          onChange={(e) => set({ address: e.target.value })}
          className={inputClass}
          data-testid="loc-address"
        />
      </div>
    </div>
  );
};

export default LocationPicker;
