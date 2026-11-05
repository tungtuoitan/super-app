CREATE OR ALTER PROCEDURE rpt.usp_SalesByRegion
    @From DATE,
    @To DATE,
    @Region NVARCHAR(20) = NULL,
    @TotalRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Name AS Region,
           (SELECT SUM(o.Total) FROM sales.[Order] o
             WHERE o.RegionId = r.Id AND o.CreatedAt BETWEEN @From AND @To) AS Revenue,
           (SELECT COUNT(*) FROM sales.[Order] o
             WHERE o.RegionId = r.Id AND o.CreatedAt BETWEEN @From AND @To) AS Orders
    FROM sales.Region r
    WHERE @Region IS NULL OR r.Code = @Region
    ORDER BY Revenue DESC;
END
