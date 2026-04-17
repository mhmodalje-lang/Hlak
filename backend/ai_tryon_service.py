"""
AI Try-On Service for BARBER HUB
- Virtual hairstyle try-on using Gemini Nano Banana (gemini-3.1-flash-image-preview)
- User uploads photo + selects hairstyle
- AI generates realistic image showing how the hairstyle would look
"""

import os
import base64
import logging
from typing import Dict, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY')

# Preset hairstyles for men and women
PRESET_HAIRSTYLES_MEN = [
    {"name": "Modern Fade", "name_ar": "فيد عصري", "description": "Clean fade on sides with textured top, modern and professional"},
    {"name": "Classic Undercut", "name_ar": "أندركت كلاسيكي", "description": "Short sides with longer slicked-back top, timeless elegance"},
    {"name": "Buzz Cut", "name_ar": "قصة عسكرية", "description": "Ultra-short uniform length, low maintenance and sharp"},
    {"name": "Pompadour", "name_ar": "بومبادور", "description": "Voluminous top swept back, bold and stylish"},
    {"name": "Textured Quiff", "name_ar": "كويف محكم", "description": "Messy textured top with volume, casual yet refined"},
    {"name": "Side Part", "name_ar": "فرق جانبي", "description": "Classic side part with neat styling, professional gentleman look"},
    {"name": "Crew Cut", "name_ar": "كرو كت", "description": "Short tapered sides with slightly longer top, athletic clean look"},
    {"name": "Long Flow", "name_ar": "شعر طويل منساب", "description": "Medium to long hair flowing naturally, free-spirited style"},
]

PRESET_HAIRSTYLES_WOMEN = [
    {"name": "Layered Bob", "name_ar": "بوب متدرج", "description": "Chin-length bob with soft layers, modern and chic"},
    {"name": "Beach Waves", "name_ar": "تموجات شاطئية", "description": "Loose natural waves, effortless beachy vibe"},
    {"name": "Sleek Straight", "name_ar": "مستقيم أنيق", "description": "Perfectly straight and smooth, elegant and polished"},
    {"name": "Voluminous Curls", "name_ar": "تجعيدات كثيفة", "description": "Bouncy defined curls with volume, glamorous look"},
    {"name": "Long Layers", "name_ar": "طبقات طويلة", "description": "Long hair with flowing layers, versatile and feminine"},
    {"name": "Pixie Cut", "name_ar": "قصة بيكسي", "description": "Short and edgy pixie, bold and confident"},
    {"name": "Textured Lob", "name_ar": "لوب محكم", "description": "Long bob with texture and movement, trendy and easy"},
    {"name": "Braided Crown", "name_ar": "تاج مضفور", "description": "Hair styled with braided crown detail, romantic and elegant"},
]


async def generate_tryon_image(
    user_image_base64: str,
    hairstyle_name: str,
    hairstyle_description: str,
    gender: str,
    session_id: str
) -> Optional[str]:
    """
    Generate AI Try-On image using Gemini Nano Banana
    
    Args:
        user_image_base64: Base64 encoded user photo
        hairstyle_name: Name of the hairstyle
        hairstyle_description: Detailed description
        gender: 'male' or 'female'
        session_id: Unique session identifier
        
    Returns:
        Base64 encoded result image or None if failed
    """
    try:
        # Initialize Gemini Nano Banana chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are an expert AI hairstylist specializing in photorealistic virtual hairstyle transformations. Your task is to take a person's photo and generate a realistic image showing them with a new hairstyle."
        )
        
        # Configure for image generation with Gemini Nano Banana
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        
        # Build detailed prompt
        gender_term = "man" if gender == "male" else "woman"
        prompt = f"""Transform this {gender_term}'s hairstyle to: {hairstyle_name}

HAIRSTYLE DETAILS: {hairstyle_description}

REQUIREMENTS:
- Keep the person's face, facial features, skin tone, and overall appearance EXACTLY the same
- ONLY change the hairstyle to match the description precisely
- The new hairstyle should look natural, realistic, and professionally styled
- Maintain proper hair texture, shine, and volume appropriate for the style
- Ensure the hairstyle complements the person's face shape
- Keep the background, clothing, and everything else unchanged
- Photo-realistic quality, as if taken in a professional salon

Generate a high-quality image showing this person with the new {hairstyle_name} hairstyle."""

        # Create message with reference image
        msg = UserMessage(
            text=prompt,
            file_contents=[ImageContent(user_image_base64)]
        )
        
        # Generate the try-on image
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            # Return the first generated image as base64
            result_image = images[0]['data']
            mime_type = images[0].get('mime_type', 'image/png')
            
            # Convert to data URL format if not already
            if not result_image.startswith('data:'):
                result_image = f"data:{mime_type};base64,{result_image}"
            
            logger.info(f"✅ AI Try-On generated successfully for session {session_id[:20]}")
            return result_image
        else:
            logger.error(f"No images generated for session {session_id[:20]}")
            return None
            
    except Exception as e:
        logger.error(f"AI Try-On generation failed for session {session_id[:20]}: {str(e)[:200]}")
        return None


def get_preset_hairstyles(gender: str, language: str = "en") -> list:
    """Get preset hairstyle options based on gender"""
    presets = PRESET_HAIRSTYLES_MEN if gender == "male" else PRESET_HAIRSTYLES_WOMEN
    
    if language == "ar":
        return [{"name": p["name_ar"], "description": p["description"], "name_en": p["name"]} for p in presets]
    else:
        return [{"name": p["name"], "description": p["description"], "name_ar": p["name_ar"]} for p in presets]
