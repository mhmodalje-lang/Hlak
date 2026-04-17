"""
AI Advisor Services for BARBER HUB
- Face shape analysis using GPT-5 Vision
- Hairstyle recommendations using GPT-5
- Style card image generation using PIL
"""

import os
import json
import base64
import re
import io
from typing import Dict, List, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

ADVISOR_SYSTEM_PROMPT_MEN = """You are "STYLE CONSULTANT" - an elite personal beauty and grooming advisor for BARBER HUB, the world's most luxurious barber platform.

Your task: Analyze the user's uploaded photo and provide a world-class personalized grooming recommendation.

You MUST respond STRICTLY as valid JSON (no markdown, no extra text), with this exact schema:
{
  "face_shape": "oval | round | square | oblong | heart | diamond | triangle",
  "face_shape_ar": "بيضاوي | مستدير | مربع | مستطيل | قلبي | ماسي | مثلث",
  "skin_tone": "light | medium | tan | dark",
  "facial_features_analysis": "<concise 2-sentence professional analysis in English>",
  "facial_features_analysis_ar": "<نفس التحليل بالعربية الفصحى>",
  "recommended_styles": [
    {
      "name": "<style name in English>",
      "name_ar": "<اسم القصة بالعربية>",
      "description": "<why it suits this face>",
      "description_ar": "<السبب بالعربية>",
      "difficulty": "easy | medium | expert",
      "maintenance": "low | medium | high",
      "icon": "✂️"
    }
  ],
  "beard_recommendation": {
    "style": "<beard style name>",
    "style_ar": "<اسم اللحية بالعربية>",
    "reason": "<why this beard suits this face>",
    "reason_ar": "<السبب بالعربية>"
  },
  "hair_care_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "hair_care_tips_ar": ["<نصيحة 1>", "<نصيحة 2>", "<نصيحة 3>"],
  "ideal_barber_expertise": ["<expertise1 e.g. Fades>", "<expertise2>", "<expertise3>"],
  "ideal_barber_expertise_ar": ["<خبرة 1>", "<خبرة 2>", "<خبرة 3>"]
}

Rules:
- Provide EXACTLY 3 recommended styles, ranked by suitability.
- Be specific, professional, and positive - never insulting.
- Arabic text must be natural and fluent (الفصحى الراقية).
- Icons in icon field: use relevant emoji like ✂️ 💈 🔥 👑 ⚡ 🎯.
- If the image is not clear or not a face, still return valid JSON with face_shape="oval" and a note in facial_features_analysis asking for a clearer photo.
"""

ADVISOR_SYSTEM_PROMPT_WOMEN = """You are "STYLE CONSULTANT" - an elite personal beauty advisor for BARBER HUB, the world's most luxurious women's beauty salon platform.

Your task: Analyze the user's uploaded photo and provide a world-class personalized hairstyle and beauty recommendation.

You MUST respond STRICTLY as valid JSON (no markdown, no extra text), with this exact schema:
{
  "face_shape": "oval | round | square | oblong | heart | diamond | triangle",
  "face_shape_ar": "بيضاوي | مستدير | مربع | مستطيل | قلبي | ماسي | مثلث",
  "skin_tone": "light | medium | tan | dark",
  "facial_features_analysis": "<concise 2-sentence professional analysis in English>",
  "facial_features_analysis_ar": "<نفس التحليل بالعربية الفصحى>",
  "recommended_styles": [
    {
      "name": "<hairstyle name in English>",
      "name_ar": "<اسم التسريحة بالعربية>",
      "description": "<why it suits this face>",
      "description_ar": "<السبب بالعربية>",
      "difficulty": "easy | medium | expert",
      "maintenance": "low | medium | high",
      "icon": "💇‍♀️"
    }
  ],
  "color_recommendation": {
    "primary_color": "<color name>",
    "primary_color_ar": "<اللون بالعربية>",
    "highlights": "<highlight suggestion>",
    "highlights_ar": "<الهايلايت بالعربية>",
    "reason": "<why these colors suit the skin tone>",
    "reason_ar": "<السبب بالعربية>"
  },
  "hair_care_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "hair_care_tips_ar": ["<نصيحة 1>", "<نصيحة 2>", "<نصيحة 3>"],
  "ideal_barber_expertise": ["<expertise1 e.g. Balayage>", "<expertise2>", "<expertise3>"],
  "ideal_barber_expertise_ar": ["<خبرة 1>", "<خبرة 2>", "<خبرة 3>"]
}

Rules:
- Provide EXACTLY 3 recommended styles, ranked by suitability.
- Be specific, professional, positive and uplifting.
- Arabic text must be natural and fluent (الفصحى الراقية).
- Icons: 💇‍♀️ ✨ 🌸 👑 💎 🌟.
- If the image is not clear or not a face, still return valid JSON with face_shape="oval" and a note in facial_features_analysis asking for a clearer photo.
"""


def _extract_json(text: str) -> Optional[Dict]:
    """Try to parse JSON from LLM output, tolerant to markdown fences"""
    if not text:
        return None
    # Strip code fences
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Find first { ... last }
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            return None
    return None


async def analyze_face_and_recommend(
    image_base64: str,
    gender: str,
    session_id: str,
) -> Dict:
    """
    Analyze user face photo and return structured recommendations.
    
    Args:
        image_base64: Base64 image (without data: prefix)
        gender: 'male' or 'female'
        session_id: Unique session id for this analysis
    
    Returns:
        Parsed dict with recommendations
    """
    if not EMERGENT_LLM_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")

    # Clean base64 (remove data url prefix if present)
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    system_prompt = ADVISOR_SYSTEM_PROMPT_WOMEN if gender == "female" else ADVISOR_SYSTEM_PROMPT_MEN

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("openai", "gpt-5")

    image_content = ImageContent(image_base64=image_base64)

    user_msg = UserMessage(
        text=(
            "Analyze this person's face and provide personalized beauty/grooming recommendations. "
            "Respond ONLY with valid JSON matching the schema described in the system message. "
            "No markdown, no explanations."
        ),
        file_contents=[image_content],
    )

    response_text = await chat.send_message(user_msg)
    parsed = _extract_json(response_text)

    if not parsed:
        # Fallback structure so UI never crashes
        parsed = {
            "face_shape": "oval",
            "face_shape_ar": "بيضاوي",
            "skin_tone": "medium",
            "facial_features_analysis": "Could not analyze the image clearly. Please try a clearer front-facing photo.",
            "facial_features_analysis_ar": "لم نتمكن من تحليل الصورة بوضوح. يرجى رفع صورة أوضح من الأمام.",
            "recommended_styles": [],
            "hair_care_tips": [],
            "hair_care_tips_ar": [],
            "ideal_barber_expertise": [],
            "ideal_barber_expertise_ar": [],
        }

    return parsed


# ============== STYLE CARD IMAGE GENERATION ==============

def _safe_arabic_text(text: str) -> str:
    """Returns Arabic text reversed for basic rendering support in PIL
    (simple fallback; ideally use arabic-reshaper + python-bidi if available)"""
    try:
        from bidi.algorithm import get_display
        import arabic_reshaper
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Try several fonts that might be installed"""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def generate_style_card(
    user_name: str,
    face_shape: str,
    face_shape_ar: str,
    styles: List[Dict],
    gender: str,
    language: str = "ar",
) -> str:
    """
    Generate a beautiful visual Style Card as PNG and return as base64.
    
    Args:
        user_name: Customer name
        face_shape: English face shape
        face_shape_ar: Arabic face shape
        styles: List of {name, name_ar, icon} up to 3
        gender: 'male' or 'female'
        language: 'ar' or 'en'
    
    Returns:
        base64-encoded PNG (data URL)
    """
    W, H = 1080, 1350  # Instagram story / share ratio 4:5 portrait

    # Gender colors
    if gender == "female":
        bg_top = (253, 247, 242)
        bg_bottom = (250, 225, 215)
        primary = (183, 110, 121)
        accent = (158, 91, 102)
        text_dark = (28, 25, 23)
        card_bg = (255, 255, 255)
    else:
        bg_top = (10, 10, 10)
        bg_bottom = (31, 26, 10)
        primary = (212, 175, 55)
        accent = (243, 229, 171)
        text_dark = (248, 250, 252)
        card_bg = (31, 31, 31)

    # Gradient background
    img = Image.new("RGB", (W, H), bg_top)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        ratio = y / H
        r = int(bg_top[0] * (1 - ratio) + bg_bottom[0] * ratio)
        g = int(bg_top[1] * (1 - ratio) + bg_bottom[1] * ratio)
        b = int(bg_top[2] * (1 - ratio) + bg_bottom[2] * ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Decorative corner circles
    for _ in range(1):
        draw.ellipse((-120, -120, 200, 200), fill=primary + (0,) if False else primary, outline=None)
        draw.ellipse((W - 180, H - 180, W + 120, H + 120), fill=primary)

    # Top Brand Bar
    font_brand = _load_font(64, bold=True)
    brand_text = "BARBER HUB"
    bbox = draw.textbbox((0, 0), brand_text, font=font_brand)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 80), brand_text, fill=primary, font=font_brand)

    font_tagline = _load_font(26)
    tagline = "Your Personal Style Report" if language == "en" else _safe_arabic_text("تقرير ستايلك الشخصي")
    bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 160), tagline, fill=text_dark, font=font_tagline)

    # User Name
    font_name = _load_font(42, bold=True)
    display_name = user_name if user_name else ("Valued Guest" if language == "en" else _safe_arabic_text("ضيف عزيز"))
    bbox = draw.textbbox((0, 0), display_name, font=font_name)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 230), display_name, fill=accent, font=font_name)

    # Divider
    draw.line([(W // 2 - 120, 310), (W // 2 + 120, 310)], fill=primary, width=3)

    # Face Shape Section
    font_label = _load_font(30)
    font_value = _load_font(54, bold=True)

    shape_label = "Face Shape" if language == "en" else _safe_arabic_text("شكل الوجه")
    bbox = draw.textbbox((0, 0), shape_label, font=font_label)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 355), shape_label, fill=text_dark, font=font_label)

    shape_value = face_shape.upper() if language == "en" else _safe_arabic_text(face_shape_ar or face_shape)
    bbox = draw.textbbox((0, 0), shape_value, font=font_value)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 400), shape_value, fill=primary, font=font_value)

    # Styles Card Section
    font_section = _load_font(34, bold=True)
    section_label = "Recommended Styles" if language == "en" else _safe_arabic_text("القصات المقترحة")
    bbox = draw.textbbox((0, 0), section_label, font=font_section)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 510), section_label, fill=text_dark, font=font_section)

    card_top = 580
    card_h = 200
    card_gap = 24
    font_style_num = _load_font(48, bold=True)
    font_style_name = _load_font(36, bold=True)
    font_style_desc = _load_font(22)

    for i, style in enumerate(styles[:3]):
        y = card_top + i * (card_h + card_gap)
        # Card shadow
        draw.rounded_rectangle([60, y, W - 60, y + card_h], radius=20, fill=card_bg)
        # Number
        draw.rounded_rectangle([90, y + 50, 190, y + 150], radius=50, fill=primary)
        num_text = str(i + 1)
        bbox = draw.textbbox((0, 0), num_text, font=font_style_num)
        nw = bbox[2] - bbox[0]
        nh = bbox[3] - bbox[1]
        draw.text((90 + (100 - nw) // 2, y + 50 + (100 - nh) // 2 - 5), num_text, fill=bg_top, font=font_style_num)

        # Style name
        sname = style.get("name") if language == "en" else _safe_arabic_text(style.get("name_ar") or style.get("name", ""))
        draw.text((220, y + 50), sname[:30], fill=text_dark, font=font_style_name)

        # Style desc (truncated)
        sdesc_raw = style.get("description") if language == "en" else style.get("description_ar") or style.get("description", "")
        sdesc = _safe_arabic_text(sdesc_raw) if language != "en" else sdesc_raw
        if len(sdesc) > 60:
            sdesc = sdesc[:60] + "..."
        draw.text((220, y + 105), sdesc, fill=text_dark, font=font_style_desc)

        # Icon emoji (best-effort, font might not render)
        icon = style.get("icon") or "✂"
        try:
            draw.text((W - 150, y + 70), icon, fill=primary, font=font_style_name)
        except Exception:
            pass

    # Footer
    font_footer = _load_font(22)
    footer_text = "Book your appointment at barber-hub.com" if language == "en" else _safe_arabic_text("احجز موعدك عبر منصة بربر هب")
    bbox = draw.textbbox((0, 0), footer_text, font=font_footer)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - 90), footer_text, fill=accent, font=font_footer)

    # Decorative bottom line
    draw.rectangle([0, H - 40, W, H], fill=primary)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    raw = buf.getvalue()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")
