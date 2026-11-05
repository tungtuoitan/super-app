CREATE OR ALTER PROCEDURE rpt.usp_SalesByRegion
    @From DATE,
    @To DATE,
    @Region NVARCHAR(20) = NULL,
    @TotalRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @To < @From
    BEGIN
        RAISERROR('@To must not be before @From', 16, 1);
        RETURN;
    END

    SELECT r.Name AS Region,
           ISNULL(SUM(o.Total), 0) AS Revenue,
           COUNT(o.Id) AS Orders
    FROM sales.Region r
    LEFT JOIN sales.[Order] o
           ON o.RegionId = r.Id AND o.CreatedAt >= @From AND o.CreatedAt < DATEADD(DAY, 1, @To)
    WHERE @Region IS NULL OR r.Code = @Region
    GROUP BY r.Name
    ORDER BY Revenue DESC;

    SET @TotalRows = @@ROWCOUNT;
END
