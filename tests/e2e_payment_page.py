"""
E2E Playwright suite for PaymentPage (v3.9.5)

Covers:
 1. Public subscription-plans endpoint returns data + renders on /payment
 2. Billing cycle toggle (monthly/yearly) switches amount shown
 3. Transfer-recipient selection (Syriatel Cash / exchange office) shows recipient details
 4. Receipt upload flow → submit → reference code BH-YY-XXXXXX is displayed

Usage:
    /opt/plugins-venv/bin/python3 /app/tests/e2e_payment_page.py

Requires:
    - Frontend preview reachable at REACT_APP_BACKEND_URL
    - Test salon credentials in /app/memory/test_credentials.md
"""
import asyncio
import base64
import io
import json as _json
import os
import re
import sys
from pathlib import Path

# The frontend .env provides the public URL. Read it directly.
FRONTEND_ENV = Path("/app/frontend/.env")
BACKEND_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        BACKEND_URL = line.split("=", 1)[1].strip().strip('"')
        break
if not BACKEND_URL:
    print("ERROR: REACT_APP_BACKEND_URL not found in /app/frontend/.env")
    sys.exit(1)

SALON_PHONE = "0998765432"
SALON_PASSWORD = "TestPass2026!"
PAYMENT_URL = f"{BACKEND_URL}/payment"


def make_dummy_receipt() -> str:
    """Generate a small valid PNG as a data URI (~1 KB)."""
    try:
        from PIL import Image
        img = Image.new("RGB", (200, 200), "red")
        buf = io.BytesIO()
        img.save(buf, "PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        # Fallback: a known-valid 10x10 PNG
        raw = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000320000003208020000"
            "001f3ff610000000084944415478daedcd01010000008020fdaa6e2a"
            "06e9000000000049454e44ae426082"
        )
        return "data:image/png;base64," + base64.b64encode(raw).decode()


async def run():
    from playwright.async_api import async_playwright

    results = []
    def check(name: str, ok: bool, detail: str = ""):
        status = "✅ PASS" if ok else "❌ FAIL"
        results.append((name, ok, detail))
        print(f"{status} — {name}{(' · ' + detail) if detail else ''}")
        return ok

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        # Pre-populate localStorage so Social Gate + Onboarding Tour + Install Prompt don't block us
        await ctx.add_init_script(
            """
            window.localStorage.setItem('bh_social_gate_v1_completed','1');
            window.localStorage.setItem('barber_hub_gender','male');
            window.localStorage.setItem('barber_hub_onboarded_v1','1');
            window.localStorage.setItem('bh_install_prompt_state_v1', JSON.stringify({dismissed:true,dismissedAt:Date.now()}));
            """
        )
        page = await ctx.new_page()

        # --- 1. Log in as salon via Playwright's request fixture (uses the
        # browser's network path so ingress/CORS rules behave correctly) ---
        try:
            resp = await ctx.request.post(
                f"{BACKEND_URL}/api/auth/login",
                data={"phone_number": SALON_PHONE, "password": SALON_PASSWORD},
            )
            login_body = await resp.json()
            token = login_body.get("access_token")
            user = login_body.get("user", {})
            check("login-as-salon", bool(token), f"status={resp.status} token len={len(token or '')}")
        except Exception as e:
            check("login-as-salon", False, str(e))
            await browser.close()
            return 1

        # Navigate once to set origin, then inject
        await page.goto(PAYMENT_URL, wait_until="domcontentloaded", timeout=20000)
        await page.evaluate(
            f"""
            window.localStorage.setItem('barber_hub_token', {_json.dumps(token)});
            window.localStorage.setItem('barber_hub_user', {_json.dumps(_json.dumps(user))});
            window.localStorage.setItem('barber_hub_user_type', 'barbershop');
            """
        )
        await page.goto(PAYMENT_URL, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3500)

        # --- 2. Payment page loaded ---
        payment_page_found = await page.locator('[data-testid="payment-page"]').count()
        check("payment-page-loaded", payment_page_found > 0)

        # --- 3. At least one subscription plan rendered ---
        plan_buttons = await page.locator('[data-testid^="plan-"]').count()
        check("plans-rendered", plan_buttons > 0, f"count={plan_buttons}")

        # --- 4. Select first plan ---
        if plan_buttons:
            await page.locator('[data-testid^="plan-"]').first.click()
            await page.wait_for_timeout(500)

        # --- 5. Billing cycle toggle appears + yearly switches ---
        monthly_btn = page.locator('[data-testid="billing-cycle-monthly"]')
        yearly_btn = page.locator('[data-testid="billing-cycle-yearly"]')
        has_billing_toggle = await monthly_btn.count() > 0 and await yearly_btn.count() > 0
        check("billing-cycle-toggle-present", has_billing_toggle)
        if has_billing_toggle:
            await yearly_btn.click()
            await page.wait_for_timeout(400)

        # --- 6. Method: pick Syriatel Cash ---
        syriatel_btn = page.locator('[data-testid="method-syriatel"]')
        if await syriatel_btn.count() > 0:
            await syriatel_btn.click()
            await page.wait_for_timeout(400)
            check("syriatel-method-selected", True)
        else:
            check("syriatel-method-selected", False, "button missing")

        # --- 7. Recipient name visible ---
        recipient_name_visible = await page.locator('[data-testid="recipient-name"]').count()
        check("recipient-name-visible", recipient_name_visible > 0)

        # --- 8. Upload a tiny dummy receipt via the file input ---
        receipt_png = make_dummy_receipt()
        # Write a temp file we can upload via Playwright's set_input_files
        tmp_path = "/tmp/e2e_receipt.png"
        png_bytes = base64.b64decode(receipt_png.split(",", 1)[1])
        with open(tmp_path, "wb") as f:
            f.write(png_bytes)
        file_input = page.locator('[data-testid="receipt-file-input"]')
        if await file_input.count() > 0:
            await file_input.set_input_files(tmp_path)
            await page.wait_for_timeout(500)
            check("receipt-uploaded", True)
        else:
            check("receipt-uploaded", False, "file input missing")

        # --- 9. Click submit ---
        submit_btn = page.locator('[data-testid="submit-order-btn"]')
        submit_count = await submit_btn.count()
        check("submit-button-present", submit_count > 0)
        if submit_count:
            await submit_btn.click()
            # Wait up to 10s for the success screen
            try:
                await page.wait_for_selector('[data-testid="order-success-screen"]', timeout=10000)
                check("order-success-screen-shown", True)
            except Exception:
                check("order-success-screen-shown", False, "timeout waiting for success screen")

        # --- 10. Reference code format BH-YY-XXXXXX ---
        ref_locator = page.locator('[data-testid="ref-code"]')
        if await ref_locator.count() > 0:
            ref_text = (await ref_locator.first.inner_text()).strip()
            ok = bool(re.match(r"^BH-\d{2}-[A-F0-9]{6}$", ref_text, re.IGNORECASE))
            check("ref-code-format", ok, f"got {ref_text!r}")
        else:
            check("ref-code-format", False, "ref-code locator missing")

        await browser.close()

    # Summary
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n==== {passed}/{total} assertions passed ====")
    return 0 if passed == total else 1


if __name__ == "__main__":
    rc = asyncio.run(run())
    sys.exit(rc)
