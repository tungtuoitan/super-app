def sync_customers(client, since):
    """Copy customers changed since `since` from the CRM into our database."""
    page = 1
    total_pages = None
    synced = 0
    while total_pages is None or page <= total_pages:
        data = get_with_retry(client, "/customers", params={"since": since, "page": page})
        total_pages = data["total_pages"]
        for c in data["items"]:
            if not c.get("email"):
                log.warning("skipping customer %s without email", c["id"])
                continue
            upsert_customer(c)
            synced += 1
        page += 1
    return synced


def get_with_retry(client, path, params, attempts=3):
    for i in range(attempts):
        try:
            return client.get(path, params=params)
        except RateLimited as e:
            if i == attempts - 1:
                raise
            time.sleep(e.retry_after or 2 ** i)
