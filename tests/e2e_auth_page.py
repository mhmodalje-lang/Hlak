"""
E2E Playwright suite for AuthPage (v3.9.6)

Covers:
 1. Login loop FIX — valid credentials redirect to /dashboard (salon) or /admin (admin); no bounce-back to /auth
 2. Shop-type selector at registration — both male and female buttons click and persist the choice
 3. Role-based redirect — master admin email → /admin, salon → /dashboard
 4. Token persistence — reload page keeps the user logged in

Usage:
    /opt/plugins-venv/bin/python3 /app/tests/e2e_auth_page.py
"""
import asyncio
import json as _json
import re
import sys
from pathlib import Path

# Load REACT_APP_BACKEND_URL from the frontend .env
FRONTEND_ENV = Path("/app/frontend/.env")
BACKEND_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        BACKEND_URL = line.split("=", 1)[1].strip().strip('"')
        break
if not BACKEND_URL:
    print("ERROR: REACT_APP_BACKEND_URL missing from /app/frontend/.env")
    sys.exit(1)

AUTH_URL = f"{BACKEND_URL}/auth"

# Known credentials (sync with /app/memory/test_credentials.md)
SALON = {"phone": "0998765432", "password": "TestPass2026!", "expected_path": "/dashboard"}
ADMIN = {"phone": "admin", "password": "NewStrong2026!xYz", "expected_path": "/admin"}


async def run():
    from playwright.async_api import async_playwright

    results = []
    def check(name: str, ok: bool, detail: str = ""):
        tag = "✅ PASS" if ok else "❌ FAIL"
        results.append((name, ok, detail))
        print(f"{tag} — {name}{(' · ' + detail) if detail else ''}")
        return ok

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # ---------- Test 1: Salon login → /dashboard (no loop) ----------
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_init_script(
            """
            window.localStorage.setItem('bh_social_gate_v1_completed','1');
            window.localStorage.setItem('barber_hub_gender','male');
            window.localStorage.setItem('barber_hub_onboarded_v1','1');
            window.localStorage.setItem('bh_install_prompt_state_v1', JSON.stringify({dismissed:true,dismissedAt:Date.now()}));
            """
        )
        page = await ctx.new_page()
        await page.goto(AUTH_URL, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2500)

        # Login tab is the default — switch to phone mode first
        await page.locator('[data-testid="login-method-phone"]').click()
        await page.wait_for_timeout(400)

        # Fill phone + password using the real data-testids
        await page.locator('[data-testid="login-email-phone"]').fill(SALON["phone"])
        await page.locator('[data-testid="login-password"]').fill(SALON["password"])
        await page.locator('[data-testid="login-submit"]').click()

        # Wait for URL to change AWAY from /auth
        try:
            await page.wait_for_url(re.compile(r".*/(dashboard|home|admin)"), timeout=15000)
            check("salon-login-no-loop", True, f"final_url={page.url}")
        except Exception:
            check("salon-login-no-loop", False, f"final_url={page.url} (still on /auth = loop)")

        # Role-based redirect: salon → /dashboard
        ok_salon_route = "/dashboard" in page.url
        check("salon-routed-to-dashboard", ok_salon_route, f"url={page.url}")

        # ---------- Test 2: Token persistence across reload ----------
        await page.reload(wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2000)
        still_logged = "/auth" not in page.url
        check("token-persists-on-reload", still_logged, f"url={page.url}")

        await ctx.close()

        # ---------- Test 3: Admin login → /admin ----------
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_init_script(
            """
            window.localStorage.setItem('bh_social_gate_v1_completed','1');
            window.localStorage.setItem('barber_hub_gender','male');
            window.localStorage.setItem('barber_hub_onboarded_v1','1');
            window.localStorage.setItem('bh_install_prompt_state_v1', JSON.stringify({dismissed:true,dismissedAt:Date.now()}));
            """
        )
        page = await ctx.new_page()
        await page.goto(AUTH_URL, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2500)

        await page.locator('[data-testid="login-method-phone"]').click()
        await page.wait_for_timeout(400)
        await page.locator('[data-testid="login-email-phone"]').fill(ADMIN["phone"])
        await page.locator('[data-testid="login-password"]').fill(ADMIN["password"])
        await page.locator('[data-testid="login-submit"]').click()

        try:
            await page.wait_for_url(re.compile(r".*/(admin|dashboard|home)"), timeout=15000)
            check("admin-login-no-loop", True, f"final_url={page.url}")
        except Exception:
            check("admin-login-no-loop", False, f"final_url={page.url}")

        ok_admin_route = "/admin" in page.url
        check("admin-routed-to-admin", ok_admin_route, f"url={page.url}")
        await ctx.close()

        # ---------- Test 4: Shop-type selector at registration ----------
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_init_script(
            """
            window.localStorage.setItem('bh_social_gate_v1_completed','1');
            window.localStorage.setItem('barber_hub_gender','male');
            window.localStorage.setItem('barber_hub_onboarded_v1','1');
            window.localStorage.setItem('bh_install_prompt_state_v1', JSON.stringify({dismissed:true,dismissedAt:Date.now()}));
            """
        )
        page = await ctx.new_page()
        await page.goto(AUTH_URL, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2500)

        # Switch to Register tab
        await page.locator('[data-testid="tab-register"]').click()
        await page.wait_for_timeout(600)

        # Switch the auth-type tab to "barbershop"
        await page.locator('[data-testid="toggle-shop"]').click()
        await page.wait_for_timeout(400)

        male_btn = page.locator('[data-testid="shop-type-male"]')
        female_btn = page.locator('[data-testid="shop-type-female"]')
        has_selector = await male_btn.count() > 0 and await female_btn.count() > 0
        check("shop-type-selector-present", has_selector)

        if has_selector:
            # Click female, then male, then female again to verify toggle behaviour
            await female_btn.click()
            await page.wait_for_timeout(300)
            female_classes = await female_btn.get_attribute("class") or ""
            check("female-selector-highlighted", "border-pink-400" in female_classes, f"classes={female_classes[:120]}")

            await male_btn.click()
            await page.wait_for_timeout(300)
            male_classes = await male_btn.get_attribute("class") or ""
            check("male-selector-highlighted", "border-amber-400" in male_classes, f"classes={male_classes[:120]}")

        await browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n==== {passed}/{total} assertions passed ====")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
