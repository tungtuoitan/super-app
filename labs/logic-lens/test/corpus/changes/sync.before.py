def sync_customers(client, since):
    """Copy customers changed since `since` from the CRM into our database."""
    page = 1
    first = client.get("/customers", params={"since": since, "page": page})
    total_pages = first["total_pages"]
    synced = 0
    while page < total_pages:
        data = client.get("/customers", params={"since": since, "page": page})
        for c in data["items"]:
            upsert_customer(c)
            synced += 1
        page += 1
    return synced
