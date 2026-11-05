CREATE OR ALTER PROCEDURE acc.usp_CloseMonth
    @Year INT,
    @Month INT,
    @ClosedBy NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM acc.Period WHERE Year = @Year AND Month = @Month AND IsClosed = 1)
    BEGIN
        RAISERROR('Period already closed', 16, 1);
        RETURN;
    END

    DECLARE @AccountId INT, @Balance DECIMAL(18, 2);
    DECLARE acc_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT Id FROM acc.Account WHERE IsActive = 1;

    BEGIN TRY
        BEGIN TRANSACTION;
        OPEN acc_cursor;
        FETCH NEXT FROM acc_cursor INTO @AccountId;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SELECT @Balance = ISNULL(SUM(Amount), 0)
            FROM acc.Entry
            WHERE AccountId = @AccountId AND YEAR(PostedAt) = @Year AND MONTH(PostedAt) = @Month;

            INSERT INTO acc.MonthlyBalance (AccountId, Year, Month, Balance)
            VALUES (@AccountId, @Year, @Month, @Balance);

            IF @Balance < 0
                INSERT INTO acc.Alert (AccountId, Message) VALUES (@AccountId, N'Negative balance at month end');

            FETCH NEXT FROM acc_cursor INTO @AccountId;
        END
        CLOSE acc_cursor;

        UPDATE acc.Period SET IsClosed = 1, ClosedBy = @ClosedBy, ClosedAt = SYSUTCDATETIME()
        WHERE Year = @Year AND Month = @Month;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        IF CURSOR_STATUS('local', 'acc_cursor') >= 0 CLOSE acc_cursor;
        THROW;
    END CATCH
END
