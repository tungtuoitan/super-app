/* Logic Lens — built-in examples: invented code with a hand-made diagram each.
 * Box line ranges are given as text anchors and resolved against the code at load.
 */
(function (LL) {
  "use strict";

  const SQL = `CREATE OR ALTER PROCEDURE plm.usp_RFD_Search
    @StyleNo        NVARCHAR(50)  = NULL,
    @CollectionId   INT           = NULL,
    @StatusCode     INT           = NULL,
    @DueFrom        DATE          = NULL,
    @DueTo          DATE          = NULL,
    @ShowLatest     BIT           = 0,
    @ViewMode       VARCHAR(10)   = 'list',   -- list | kanban | timeline | download
    @GroupBy        VARCHAR(20)   = 'status',
    @PageIndex      INT           = 1,
    @PageSize       INT           = 50,
    @WithMilestone  BIT           = 0,
    @ov_TotalRows   INT OUTPUT,
    @ov_TotalRowsMax INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Build the WHERE clause: one AND per parameter that is not NULL
    DECLARE @where NVARCHAR(MAX) = N' WHERE r.IsDeleted = 0';
    IF @StyleNo IS NOT NULL      SET @where += N' AND s.StyleNo LIKE @StyleNo + ''%''';
    IF @CollectionId IS NOT NULL SET @where += N' AND s.CollectionId = @CollectionId';
    IF @StatusCode IS NOT NULL   SET @where += N' AND r.StatusCode = @StatusCode';
    IF @DueFrom IS NOT NULL      SET @where += N' AND r.DueDate >= @DueFrom';
    IF @DueTo IS NOT NULL        SET @where += N' AND r.DueDate <= @DueTo';

    -- 2. Build the FROM clause
    DECLARE @from NVARCHAR(MAX) = N'
        FROM plm.RFD r
        JOIN plm.Style s        ON s.Id = r.StyleId
        JOIN plm.Product p      ON p.Id = s.ProductId
        JOIN plm.Collection c   ON c.Id = s.CollectionId
        LEFT JOIN dbo.StandardRegistry st  ON st.Code = r.StatusCode   AND st.Type = ''RFD_STATUS''
        LEFT JOIN dbo.StandardRegistry pr  ON pr.Code = r.PriorityCode AND pr.Type = ''PRIORITY''
        LEFT JOIN dbo.StandardRegistry se  ON se.Code = s.SeasonCode   AND se.Type = ''SEASON''
        LEFT JOIN dbo.StandardRegistry ge  ON ge.Code = p.GenderCode   AND ge.Type = ''GENDER''
        LEFT JOIN dbo.StandardRegistry ca  ON ca.Code = p.CategoryCode AND ca.Type = ''CATEGORY''
        LEFT JOIN dbo.StandardRegistry de  ON de.Code = r.DeptCode     AND de.Type = ''DEPT''
        OUTER APPLY (
            SELECT STRING_AGG(f.FileName, '';'') AS Drawings
            FROM plm.RFDFile f WHERE f.RFDId = r.Id AND f.Kind = ''DRAWING''
        ) dw';

    -- Show latest: keep only the newest RFD of each style (applied after the filter)
    IF @ShowLatest = 1
        SET @where += N' AND r.Id = (SELECT MAX(r2.Id) FROM plm.RFD r2
                                     WHERE r2.StyleId = r.StyleId AND r2.IsDeleted = 0)';

    DECLARE @sql NVARCHAR(MAX);
    DECLARE @params NVARCHAR(MAX) = N'@StyleNo NVARCHAR(50), @CollectionId INT, @StatusCode INT,
        @DueFrom DATE, @DueTo DATE, @PageIndex INT, @PageSize INT, @ov_TotalRows INT OUTPUT, @ov_TotalRowsMax INT OUTPUT';

    -- 3. Pick the view mode: only one branch runs
    IF @ViewMode = 'list'
    BEGIN
        SET @sql = N'SELECT @ov_TotalRows = COUNT(*) ' + @from + @where + N';
            SELECT r.Id, s.StyleNo, st.Name AS Status, r.DueDate,
                   DATEDIFF(HOUR, r.CreatedAt, SYSUTCDATETIME()) AS AgeHours,
                   (SELECT COUNT(*) FROM plm.RFDFile f WHERE f.RFDId = r.Id) AS FileCount,
                   dw.Drawings
            ' + @from + @where + N'
            ORDER BY r.Id DESC
            OFFSET (@PageIndex - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;';
    END
    ELSE IF @ViewMode = 'kanban'
    BEGIN
        SET @sql = N';WITH cards AS (
                SELECT r.Id, r.StatusCode, s.StyleNo, r.DueDate,
                       ROW_NUMBER() OVER (PARTITION BY r.StatusCode ORDER BY r.DueDate, r.Id) AS rn
                ' + @from + @where + N')
            SELECT @ov_TotalRows = COUNT(*),
                   @ov_TotalRowsMax = MAX(cnt)
            FROM (SELECT StatusCode, COUNT(*) AS cnt FROM cards GROUP BY StatusCode) t;
            SELECT * FROM cards
            WHERE rn BETWEEN (@PageIndex - 1) * @PageSize + 1 AND @PageIndex * @PageSize;';
    END
    ELSE IF @ViewMode = 'timeline'
    BEGIN
        SET @sql = N'SELECT CASE @GroupBy WHEN ''status'' THEN st.Name
                                         WHEN ''season'' THEN se.Name
                                         ELSE c.Name END AS GroupName,
                   COUNT(*) AS RFDCount, MIN(r.CreatedAt) AS FirstCreated, MAX(r.DueDate) AS LastDue
            ' + @from + @where + N'
            GROUP BY CASE @GroupBy WHEN ''status'' THEN st.Name
                                   WHEN ''season'' THEN se.Name
                                   ELSE c.Name END;
            SET @ov_TotalRows = 0;';
    END
    ELSE IF @ViewMode = 'download'
    BEGIN
        SET @sql = N'SELECT r.Id, f.FileName, f.BlobUrl ' + @from + N'
            JOIN plm.RFDFile f ON f.RFDId = r.Id ' + @where + N';';
        IF @WithMilestone = 1
            SET @sql += N' SELECT m.RFDId, m.Name, m.DoneAt FROM plm.RFDMilestone m
                           WHERE m.RFDId IN (SELECT r.Id ' + @from + @where + N');';
        -- note: @ov_TotalRows is not assigned here, so callers get NULL
    END

    EXEC sp_executesql @sql, @params,
        @StyleNo, @CollectionId, @StatusCode, @DueFrom, @DueTo, @PageIndex, @PageSize,
        @ov_TotalRows OUTPUT, @ov_TotalRowsMax OUTPUT;
END`;

  const SQL_FLOW = {
    title: "Tìm kiếm RFD (plm.usp_RFD_Search)",
    summary: "Nhận bộ lọc và kiểu xem, ghép câu SQL động rồi chạy đúng một nhánh: lưới, Kanban, timeline hoặc tải file. Trả về danh sách RFD kèm hai số tổng qua tham số OUTPUT.",
    entities: [{ name: "plm.RFD", note: "một yêu cầu phát triển (RFD) của một style" }, { name: "plm.Style", note: "một mẫu thiết kế" }, { name: "plm.RFDFile", note: "một file bản vẽ đính kèm RFD" }, { name: "plm.RFDMilestone", note: "một mốc tiến độ của RFD" }],
    scenarios: [{ title: "Xem dạng lưới", picks: ["Lưới Rows"] }, { title: "Xem Kanban", picks: ["Kanban"] }, { title: "Tải file", picks: ["Download"] }],
    steps: [
      { kind: "step", title: "Nhận tham số", sub: "bộ lọc, trang, kiểu xem (list / Kanban / download)", anchor: ["CREATE OR ALTER PROCEDURE", "@ov_TotalRowsMax INT OUTPUT"], detail: "Mọi bộ lọc đều mặc định NULL, nghĩa là “không lọc theo trường này”. @ViewMode quyết định nhánh nào sẽ chạy ở bước 3." },
      { kind: "stage", title: "1. Ghép điều kiện lọc", sub: "mỗi tham số khác NULL thêm một đoạn \"AND ...\"", anchor: ["-- 1. Build the WHERE", "IF @DueTo IS NOT NULL"], detail: "Câu WHERE được ghép bằng chuỗi nhưng giá trị vẫn truyền qua tham số của sp_executesql, nên không bị SQL injection. Luôn có sẵn điều kiện IsDeleted = 0." },
      { kind: "group", title: "2. Ghép phần FROM (nối bảng)", data: ["plm.RFD:read", "plm.Style:read", "plm.Product:read", "plm.Collection:read"], anchor: ["-- 2. Build the FROM", "WHERE r2.StyleId = r.StyleId"], detail: "Cùng một phần FROM được dùng lại cho mọi chế độ xem. Sáu lần nối StandardRegistry chỉ để đổi mã thành tên hiển thị.",
        items: [{ title: "plm.RFD" }, { title: "Style", sub: "(Product + Collection)" }, { title: "6 bảng tra mã", sub: "(StandardRegistry)" }, { title: "File bản vẽ", sub: "gộp thành 1 chuỗi" }],
        note: "Show latest: chỉ giữ RFD có Id lớn nhất mỗi style, tính sau khi lọc" },
      { kind: "step", title: "3. Chọn chế độ", sub: "theo @ViewMode, chỉ một nhánh chạy", anchor: ["-- 3. Pick the view mode", "IF @ViewMode = 'list'"] },
      { kind: "branch", lanes: [
        { title: "Lưới Rows", sub: "= 'list'", anchor: ["IF @ViewMode = 'list'", "OFFSET (@PageIndex - 1)"], steps: [
          { kind: "step", title: "Đếm tổng", sub: "số RFD sau lọc", anchor: ["SELECT @ov_TotalRows = COUNT(*) ' + @from"] },
          { kind: "step", title: "Lấy một trang", sub: "Id giảm dần", data: ["plm.RFD:read"], anchor: ["ORDER BY r.Id DESC", "OFFSET (@PageIndex - 1)"] },
          { kind: "step", title: "Kèm giờ và số file", sub: "cùng danh sách bản vẽ", data: ["plm.RFDFile:read"], attention: true, anchor: ["DATEDIFF(HOUR", "dw.Drawings"], detail: "Mỗi dòng chạy thêm một truy vấn con COUNT(*) trên RFDFile. Với trang lớn đây là chỗ dễ chậm nhất của nhánh này." },
        ] },
        { title: "Kanban", sub: "= 'kanban'", anchor: ["ELSE IF @ViewMode = 'kanban'", "WHERE rn BETWEEN"], steps: [
          { kind: "step", title: "Đánh số thẻ", sub: "từ 1 trong mỗi cột", anchor: ["ROW_NUMBER() OVER (PARTITION BY r.StatusCode"] },
          { kind: "step", title: "Đếm tổng thẻ", sub: "và số thẻ của cột dài nhất", anchor: ["SELECT @ov_TotalRows = COUNT(*),", "FROM (SELECT StatusCode, COUNT(*)"], detail: "@ov_TotalRowsMax là số thẻ của cột dài nhất, dùng để biết còn trang sau hay không." },
          { kind: "step", title: "Lấy thẻ của trang", sub: "cho từng cột", anchor: ["SELECT * FROM cards", "WHERE rn BETWEEN"], detail: "Phân trang theo từng cột: trang 2 lấy thẻ 51 đến 100 của MỖI cột, không phải của cả bảng." },
        ] },
        { title: "Timeline", sub: "= 'timeline'", attention: true, anchor: ["ELSE IF @ViewMode = 'timeline'", "SET @ov_TotalRows = 0;"], detail: "Nhánh này khác hẳn ba nhánh còn lại: trả về số liệu theo nhóm chứ không phải từng RFD.", steps: [
          { kind: "step", title: "Gom nhóm", sub: "theo GroupBy", attention: true, anchor: ["SET @sql = N'SELECT CASE @GroupBy", "ELSE c.Name END AS GroupName"] },
          { kind: "step", title: "1 dòng mỗi nhóm", sub: "số RFD, ngày tạo, due", attention: true, anchor: ["COUNT(*) AS RFDCount", "ELSE c.Name END;"] },
          { kind: "step", title: "Không phân trang", sub: "tổng số dòng = 0", attention: true, anchor: ["SET @ov_TotalRows = 0;"], detail: "@PageIndex và @PageSize bị bỏ qua, và tổng luôn bằng 0 nên giao diện không được dựa vào nó để phân trang." },
        ] },
        { title: "Download", sub: "= 'download'", anchor: ["ELSE IF @ViewMode = 'download'", "-- note: @ov_TotalRows is not assigned"], steps: [
          { kind: "step", title: "File đính kèm", sub: "của RFD đã lọc", data: ["plm.RFDFile:read"], anchor: ["SET @sql = N'SELECT r.Id, f.FileName"] },
          { kind: "step", title: "Milestone", sub: "nếu được bật", data: ["plm.RFDMilestone:read"], anchor: ["IF @WithMilestone = 1", "WHERE m.RFDId IN"] },
          { kind: "step", title: "Không gán tổng", sub: "giá trị OUTPUT là NULL", anchor: ["-- note: @ov_TotalRows is not assigned"], detail: "Không nhánh nào trong Download gán @ov_TotalRows, nên phía gọi nhận NULL thay vì 0." },
        ] },
      ] },
      { kind: "stage", title: "Trả kết quả", sub: "danh sách RFD + @ov_TotalRows + @ov_TotalRowsMax", anchor: ["EXEC sp_executesql @sql", "@ov_TotalRows OUTPUT, @ov_TotalRowsMax OUTPUT;"] },
    ],
  };

  const JS = `// POST /api/checkout — turn the cart into an order and charge the card
router.post("/checkout", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { couponCode, paymentMethodId } = req.body;

  const cart = await carts.get(userId);
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: "cart_empty" });
  }

  // Re-price every item from the catalog: never trust prices stored in the cart
  const priced = await Promise.all(
    cart.items.map(async (it) => {
      const product = await catalog.find(it.sku);
      if (!product || product.stock < it.qty) throw new OutOfStock(it.sku);
      return { ...it, price: product.price };
    })
  ).catch((err) => err);
  if (priced instanceof OutOfStock) {
    return res.status(409).json({ error: "out_of_stock", sku: priced.sku });
  }

  let total = priced.reduce((sum, it) => sum + it.price * it.qty, 0);
  if (couponCode) {
    const coupon = await coupons.validate(couponCode, userId);
    if (coupon) total = Math.max(0, total - coupon.amountOff);
  }

  const order = await orders.create({ userId, items: priced, total, status: "pending" });

  try {
    const charge = await payments.charge(paymentMethodId, total, { orderId: order.id });
    await orders.update(order.id, { status: "paid", chargeId: charge.id });
    await carts.clear(userId);
    mailer.send(userId, "order-confirmation", { orderId: order.id }); // not awaited
    return res.status(201).json({ orderId: order.id, total });
  } catch (err) {
    await orders.update(order.id, { status: "payment_failed" });
    return res.status(402).json({ error: "payment_failed" });
  }
});`;

  const JS_FLOW = {
    title: "Thanh toán giỏ hàng (POST /checkout)",
    summary: "Kiểm tra giỏ, tính lại giá từ catalog, áp mã giảm giá, tạo đơn rồi trừ tiền thẻ. Mỗi bước kiểm tra có thể dừng sớm và trả lỗi.",
    steps: [
      { kind: "step", title: "Nhận yêu cầu", sub: "user đã đăng nhập, mã giảm giá, thẻ", anchor: ["router.post(\"/checkout\"", "const { couponCode, paymentMethodId }"] },
      { kind: "branch", title: "Giỏ có hàng không?", anchor: ["const cart = await carts.get", "return res.status(400)"], lanes: [
        { title: "Giỏ trống", anchor: ["if (!cart || cart.items.length === 0)"], steps: [
          { kind: "end", title: "Trả lỗi 400", sub: "cart_empty", anchor: ["return res.status(400)"] },
        ] },
        { title: "Có hàng", sub: "đi tiếp", anchor: ["const cart = await carts.get"], steps: [] },
      ] },
      { kind: "stage", title: "1. Tính lại giá", sub: "lấy giá và tồn kho từ catalog", anchor: ["// Re-price every item", "}).catch((err) => err);"], detail: "Giá trong giỏ có thể đã cũ, nên mọi món đều được tra lại song song (Promise.all)." },
      { kind: "branch", title: "Còn đủ hàng?", anchor: ["if (priced instanceof OutOfStock)", "return res.status(409)"], lanes: [
        { title: "Thiếu một món", attention: true, anchor: ["if (priced instanceof OutOfStock)"], detail: "Chỉ cần một món hết hàng là cả đơn dừng lại, kể cả khi các món khác còn đủ.", steps: [
          { kind: "end", title: "Trả lỗi 409", sub: "out_of_stock + mã SKU", anchor: ["return res.status(409)"] },
        ] },
        { title: "Đủ hàng", anchor: ["let total = priced.reduce"], steps: [] },
      ] },
      { kind: "stage", title: "2. Tính tổng tiền", sub: "trừ mã giảm giá nếu hợp lệ", attention: true, anchor: ["let total = priced.reduce", "if (coupon) total"], detail: "Mã không hợp lệ bị bỏ qua lặng lẽ: đơn vẫn đi tiếp với giá gốc, người dùng không được báo." },
      { kind: "step", title: "Tạo đơn hàng", sub: "trạng thái pending", anchor: ["const order = await orders.create"], detail: "Đơn được tạo TRƯỚC khi trừ tiền, nên nếu tiến trình chết giữa chừng sẽ còn đơn pending cần dọn." },
      { kind: "branch", title: "Trừ tiền thẻ", anchor: ["try {", "return res.status(402)"], lanes: [
        { title: "Thành công", anchor: ["const charge = await payments.charge", "return res.status(201)"], steps: [
          { kind: "step", title: "Đánh dấu đã trả", sub: "lưu chargeId, xoá giỏ", anchor: ["await orders.update(order.id, { status: \"paid\"", "await carts.clear(userId);"] },
          { kind: "step", title: "Gửi mail xác nhận", sub: "không chờ kết quả", attention: true, anchor: ["mailer.send(userId"], detail: "Không có await: nếu gửi mail lỗi, request vẫn báo thành công và lỗi chỉ hiện trong log." },
          { kind: "end", title: "Trả 201", sub: "mã đơn và tổng tiền", anchor: ["return res.status(201)"] },
        ] },
        { title: "Thất bại", anchor: ["} catch (err) {", "return res.status(402)"], steps: [
          { kind: "step", title: "Đánh dấu lỗi", sub: "payment_failed, giữ nguyên giỏ", anchor: ["status: \"payment_failed\""] },
          { kind: "end", title: "Trả lỗi 402", sub: "payment_failed", anchor: ["return res.status(402)"] },
        ] },
      ] },
    ],
  };

  const PY = `def import_products(path, dry_run=False, batch_size=500):
    """Import a supplier CSV into the products table."""
    rows, errors = [], []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for i, rec in enumerate(csv.DictReader(f), start=2):
            try:
                rows.append(Product(
                    sku=rec["SKU"].strip().upper(),
                    name=rec["Name"].strip(),
                    price=Decimal(rec["Price"].replace(",", ".")),
                    stock=int(rec.get("Stock") or 0),
                ))
            except (KeyError, InvalidOperation, ValueError) as e:
                errors.append((i, str(e)))

    if errors and len(errors) > len(rows) * 0.1:
        raise ImportAborted(f"{len(errors)} bad rows, first: {errors[0]}")

    existing = {p.sku: p for p in Product.objects.filter(sku__in=[r.sku for r in rows])}
    to_create = [r for r in rows if r.sku not in existing]
    to_update = []
    for r in rows:
        old = existing.get(r.sku)
        if old and (old.price != r.price or old.stock != r.stock):
            old.price, old.stock = r.price, r.stock
            to_update.append(old)

    if dry_run:
        return {"create": len(to_create), "update": len(to_update), "errors": errors}

    with transaction.atomic():
        Product.objects.bulk_create(to_create, batch_size=batch_size)
        Product.objects.bulk_update(to_update, ["price", "stock"], batch_size=batch_size)
    cache.delete_many([f"product:{p.sku}" for p in to_update])
    return {"created": len(to_create), "updated": len(to_update), "errors": errors}`;

  const PY_FLOW = {
    title: "Nhập sản phẩm từ CSV",
    summary: "Đọc file CSV của nhà cung cấp, bỏ qua dòng lỗi (nhưng dừng nếu quá 10% lỗi), so với dữ liệu hiện có rồi tạo mới hoặc cập nhật. Chế độ dry run chỉ báo con số.",
    steps: [
      { kind: "step", title: "Nhận đường dẫn file", sub: "dry_run, kích thước lô", anchor: ["def import_products"] },
      { kind: "loop", title: "Với mỗi dòng CSV", sub: "đánh số từ dòng 2", anchor: ["for i, rec in enumerate", "errors.append((i, str(e)))"], detail: "Số dòng bắt đầu từ 2 vì dòng 1 là tiêu đề, nên lỗi báo ra khớp với số dòng khi mở file bằng Excel.", steps: [
        { kind: "step", title: "Chuyển thành Product", sub: "SKU viết hoa, giá đổi dấu phẩy", anchor: ["rows.append(Product(", "stock=int(rec.get"] },
        { kind: "step", title: "Dòng lỗi: ghi lại", sub: "không dừng ngay", attention: true, anchor: ["except (KeyError", "errors.append((i, str(e)))"], detail: "Thiếu cột, giá sai định dạng hay số tồn không phải số đều chỉ bị ghi vào danh sách errors." },
      ] },
      { kind: "branch", title: "Lỗi quá 10%?", anchor: ["if errors and len(errors) >", "raise ImportAborted"], lanes: [
        { title: "Quá 10%", attention: true, anchor: ["if errors and len(errors) >"], steps: [
          { kind: "end", title: "Ném ImportAborted", sub: "không ghi gì vào DB", anchor: ["raise ImportAborted"] },
        ] },
        { title: "Trong ngưỡng", sub: "dòng lỗi bị bỏ qua", anchor: ["existing = {p.sku: p"], steps: [] },
      ] },
      { kind: "group", title: "So với dữ liệu hiện có", anchor: ["existing = {p.sku: p", "to_update.append(old)"], items: [{ title: "Tra theo SKU", sub: "một truy vấn" }, { title: "Mới", sub: "chưa có SKU" }, { title: "Cần cập nhật", sub: "đổi giá hoặc tồn" }], note: "SKU đã có mà không đổi gì thì bỏ qua" },
      { kind: "branch", title: "dry_run", anchor: ["if dry_run:", "cache.delete_many"], lanes: [
        { title: "Dry run", sub: "= True", anchor: ["if dry_run:", "return {\"create\""], steps: [
          { kind: "end", title: "Chỉ trả con số", sub: "không ghi gì vào DB", anchor: ["return {\"create\""] },
        ] },
        { title: "Chạy thật", sub: "= False", anchor: ["with transaction.atomic():", "cache.delete_many"], steps: [
          { kind: "step", title: "Ghi trong transaction", sub: "tạo mới và cập nhật theo lô", anchor: ["with transaction.atomic():", "Product.objects.bulk_update"] },
          { kind: "step", title: "Xoá cache sản phẩm", sub: "chỉ các SKU vừa cập nhật", attention: true, anchor: ["cache.delete_many"], detail: "Chạy SAU khi transaction commit. Sản phẩm mới tạo không cần xoá cache vì chưa từng được cache." },
        ] },
      ] },
      { kind: "stage", title: "Trả kết quả", sub: "số tạo mới, cập nhật, danh sách lỗi", anchor: ["return {\"created\""] },
    ],
  };

  const EXAMPLES = [
    { id: "sql", name: "SQL: tìm kiếm RFD", lang: "sql", code: SQL, flow: SQL_FLOW },
    { id: "js", name: "JavaScript: thanh toán", lang: "javascript", code: JS, flow: JS_FLOW },
    { id: "py", name: "Python: nhập CSV", lang: "python", code: PY, flow: PY_FLOW },
  ];

  function getExample(id) {
    const ex = EXAMPLES.find((e) => e.id === id) || EXAMPLES[0];
    const flow = LL.flow.resolveAnchors(JSON.parse(JSON.stringify(ex.flow)), ex.code);
    return { id: ex.id, name: ex.name, lang: ex.lang, code: ex.code, flow: LL.flow.normalize(flow) };
  }

  LL.sample = { EXAMPLES, getExample };
})(globalThis.LL = globalThis.LL || {});
