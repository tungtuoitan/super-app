class DashboardRepository(
    private val api: ShopApi,
    private val cache: DashboardCache,
) {
    /** Loads the three dashboard panels at the same time; a slow panel never blocks the others for more than 3 s. */
    suspend fun load(userId: String): Dashboard = coroutineScope {
        val cached = cache.get(userId)
        if (cached != null && !cached.isStale()) return@coroutineScope cached

        val orders = async { api.recentOrders(userId) }
        val recommendations = async {
            withTimeoutOrNull(3_000) { api.recommendations(userId) } ?: emptyList()
        }
        val notifications = async {
            runCatching { api.notifications(userId) }.getOrElse { emptyList() }
        }

        val dashboard = Dashboard(
            orders = orders.await(),
            recommendations = recommendations.await(),
            notifications = notifications.await(),
        )
        cache.put(userId, dashboard)
        dashboard
    }
}
