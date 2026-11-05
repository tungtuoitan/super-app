import asyncio
import random
import httpx

RETRYABLE = {429, 502, 503, 504}


async def fetch_json(client: httpx.AsyncClient, url: str, *, attempts: int = 4) -> dict:
    """GET a JSON document, retrying transient failures with exponential backoff and jitter."""
    delay = 0.5
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            resp = await client.get(url, timeout=10)
        except (httpx.ConnectError, httpx.ReadTimeout) as exc:
            last_error = exc
        else:
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code not in RETRYABLE:
                resp.raise_for_status()
            last_error = RuntimeError(f"HTTP {resp.status_code}")
            retry_after = resp.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                delay = max(delay, float(retry_after))

        if attempt == attempts:
            break
        await asyncio.sleep(delay + random.uniform(0, delay / 2))
        delay = min(delay * 2, 30)

    raise RuntimeError(f"giving up on {url} after {attempts} attempts") from last_error


async def fetch_all(urls: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(fetch_json(client, u) for u in urls))
