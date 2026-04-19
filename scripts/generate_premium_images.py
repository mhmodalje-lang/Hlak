"""
BARBER HUB — Generate premium Dark Neo-luxury AI images via Gemini Nano Banana.
Saves to /app/frontend/public/images/ai/
"""
import asyncio
import base64
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load backend env
load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT = Path("/app/frontend/public/images/ai")
OUT.mkdir(parents=True, exist_ok=True)

# Premium luxury prompt prefix — consistent aesthetic across all images
BRAND_STYLE = (
    "ultra-luxury Dark Neo-luxury aesthetic, deep obsidian black backgrounds with "
    "gold neon accents, glassmorphism reflections, dramatic cinematic lighting with rim-light, "
    "hyperrealistic 5-star commercial photography, shot on Hasselblad H6D, 85mm lens, "
    "ultra-sharp, rich textures, burgundy and antique-gold color palette, no blue or green tones, "
    "editorial magazine quality, professional color grading, photorealistic, 8K resolution"
)

PROMPTS = {
    "hero_home.png": (
        f"{BRAND_STYLE}. Luxury modern barber studio interior, single premium black leather "
        "barber chair with gold metallic frame reflections, marble wall with gold veins behind, "
        "dramatic spotlight from above creating golden light cone on the chair, vintage brass straight "
        "razor and antique gold scissors resting on a marble side table, burgundy velvet details, "
        "no people, ultra-wide cinematic angle, moody atmosphere, "
        "magazine cover quality, intensely premium feel. Portrait 9:16."
    ),
    "men_cover.png": (
        f"{BRAND_STYLE}. Handsome 35yo middle-eastern man with sharp trimmed beard and premium "
        "pompadour haircut, wearing a black silk shirt, looking confidently away from camera, "
        "half his face lit with warm golden spotlight, the other half in deep shadow, "
        "marble and gold background slightly out of focus, standing inside ultra-luxury barbershop, "
        "editorial portrait, rich skin tones, luxury men's grooming magazine cover. Portrait 9:16."
    ),
    "women_cover.png": (
        f"{BRAND_STYLE}. Elegant woman with glossy long wavy hair having a premium styling session, "
        "sitting in a luxury salon chair, her face partially visible in profile, ambient "
        "gold lighting reflecting on her hair, crystal chandelier bokeh in background, "
        "marble vanity with gold-framed mirror, rose-gold and burgundy accents, "
        "no faces fully visible to avoid identity, sophisticated & feminine luxury mood. Portrait 9:16."
    ),
    "ai_tryon_hero.png": (
        f"{BRAND_STYLE}. Futuristic AI face-scanning concept — a stylized silhouette of a human "
        "head in three-quarter view with elegant thin golden geometric lines and nodes tracing "
        "hair and beard contours, mesh overlay like AR scan, holographic UI elements floating "
        "around, deep black void background with gold neon glow, particles, "
        "extremely premium and high-tech, like an Apple Vision Pro ad. Portrait 9:16."
    ),
    "booking_cta.png": (
        f"{BRAND_STYLE}. Flat-lay of vintage antique gold barber scissors and premium wooden comb "
        "on black marble surface with gold veins, soft shadow, minimal composition, "
        "no people, clean negative space on the right for text overlay, luxury product photography. "
        "Landscape 16:9."
    ),
    "salon_interior_1.png": (
        f"{BRAND_STYLE}. Interior of an exclusive VIP barber lounge at night, three vintage "
        "black-leather barber chairs in a row, gold-framed mirrors, dark wood paneling, "
        "crystal pendant lights with warm glow, marble floor with gold inlay, bottles of premium "
        "grooming products on shelves, no people, luxurious speakeasy atmosphere. Landscape 16:9."
    ),
    "salon_interior_2.png": (
        f"{BRAND_STYLE}. Ladies' premium beauty salon interior, rose-gold and champagne color scheme, "
        "three vanity stations with large round LED-lit mirrors, velvet chairs, marble counters, "
        "fresh white orchids in gold vases, crystal chandelier, muted warm lighting, no people, "
        "ultra-feminine luxury atmosphere. Landscape 16:9."
    ),
    "feature_loyalty.png": (
        f"{BRAND_STYLE}. A luxury metallic gold loyalty card floating on a dark velvet background "
        "with embossed scissors logo, soft reflective light, with glowing gold particles. "
        "Minimal composition, product shot style. Square 1:1."
    ),
    "feature_whatsapp.png": (
        f"{BRAND_STYLE}. A premium smartphone mockup showing a chat interface in dark mode, "
        "gold message bubbles, lying flat on black marble, soft gold spotlight, top view. "
        "Square 1:1."
    ),
    "face_shape_round.png": (
        f"{BRAND_STYLE}. Abstract elegant line-art illustration of a round face shape silhouette, "
        "traced with thin golden continuous line on pure black background, minimal, iconic, "
        "like a luxury beauty brand logo element. Square 1:1."
    ),
}


async def generate_one(filename: str, prompt: str):
    """Generate a single image; return True on success."""
    out_path = OUT / filename
    if out_path.exists() and out_path.stat().st_size > 10000:
        print(f"⊙ Skip (exists): {filename}")
        return True

    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            print("✗ Missing EMERGENT_LLM_KEY")
            return False
        chat = LlmChat(
            api_key=api_key,
            session_id=f"bh-gen-{filename}",
            system_message=(
                "You are a luxury editorial photographer generating high-end images "
                "for a premium barber booking app called BARBER HUB. Always deliver magazine-cover "
                "quality images. Strictly avoid blue and green tones — the palette is "
                "black, gold, burgundy, cream, rose-gold only."
            ),
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
            modalities=["image", "text"]
        )
        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            print(f"✗ No images returned for {filename}. Text: {text[:200] if text else ''}")
            return False
        img = images[0]
        image_bytes = base64.b64decode(img["data"])
        out_path.write_bytes(image_bytes)
        print(f"✓ {filename} ({len(image_bytes)//1024} KB)")
        return True
    except Exception as e:
        print(f"✗ {filename} failed: {type(e).__name__}: {e}")
        return False


async def main():
    # Sequential but could be parallel; keep small concurrency to avoid rate issues
    sem = asyncio.Semaphore(3)

    async def worker(name, prompt):
        async with sem:
            return await generate_one(name, prompt)

    only = sys.argv[1] if len(sys.argv) > 1 else None
    tasks = []
    for name, prompt in PROMPTS.items():
        if only and only not in name:
            continue
        tasks.append(worker(name, prompt))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    ok = sum(1 for r in results if r is True)
    print(f"\n=== {ok}/{len(tasks)} images generated ===")


if __name__ == "__main__":
    asyncio.run(main())
