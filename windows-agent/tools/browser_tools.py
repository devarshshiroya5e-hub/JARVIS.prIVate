"""
Browser Automation Tools for JARVIS Windows Local Agent (Playwright)
Enables semantic navigation, element clicking, form filling, and page scraping without screen coordinate guessing.
"""
import asyncio
from playwright.async_api import async_playwright

_playwright_instance = None
_browser_instance = None
_page_instance = None

async def _ensure_browser(headless: bool = False):
    global _playwright_instance, _browser_instance, _page_instance
    if not _browser_instance or not _browser_instance.is_connected():
        _playwright_instance = await async_playwright().start()
        _browser_instance = await _playwright_instance.chromium.launch(
            headless=headless,
            args=["--start-maximized"]
        )
        context = await _browser_instance.new_context(no_viewport=True)
        _page_instance = await context.new_page()
    return _page_instance

async def browser_open(url: str, headless: bool = False) -> dict:
    """Launch automated browser and navigate to URL."""
    try:
        page = await _ensure_browser(headless=headless)
        if not url.startswith("http"):
            url = f"https://{url}"
        await page.goto(url, timeout=15000, wait_until="domcontentloaded")
        title = await page.title()
        return {
            "success": True,
            "action": "browser_open",
            "url": url,
            "title": title
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def browser_click(selector: str) -> dict:
    """Click an element matching text or CSS selector."""
    try:
        page = await _ensure_browser()
        await page.click(selector, timeout=8000)
        return {"success": True, "action": "browser_click", "selector": selector}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def browser_type(selector: str, text: str, submit: bool = False) -> dict:
    """Type into an input field and optionally submit."""
    try:
        page = await _ensure_browser()
        await page.fill(selector, text, timeout=8000)
        if submit:
            await page.keyboard.press("Enter")
        return {"success": True, "action": "browser_type", "selector": selector, "text": text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def browser_search_youtube(query: str) -> dict:
    """Automate YouTube search."""
    try:
        page = await _ensure_browser(headless=False)
        await page.goto("https://www.youtube.com", wait_until="domcontentloaded")
        await page.fill("input#search", query)
        await page.keyboard.press("Enter")
        return {"success": True, "query": query, "message": f"YouTube search automated for '{query}'"}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def close_browser() -> dict:
    """Close active Playwright browser."""
    global _playwright_instance, _browser_instance, _page_instance
    try:
        if _browser_instance:
            await _browser_instance.close()
        if _playwright_instance:
            await _playwright_instance.stop()
        _browser_instance = None
        _playwright_instance = None
        _page_instance = None
        return {"success": True, "message": "Browser closed."}
    except Exception as e:
        return {"success": False, "error": str(e)}
