IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeyUsageLogs', N'U') AND name = N'IX_ApiKeyUsageLogs_IsDeleted')
BEGIN
    CREATE INDEX [IX_ApiKeyUsageLogs_IsDeleted] ON [dbo].[ApiKeyUsageLogs] ([IsDeleted]);
END