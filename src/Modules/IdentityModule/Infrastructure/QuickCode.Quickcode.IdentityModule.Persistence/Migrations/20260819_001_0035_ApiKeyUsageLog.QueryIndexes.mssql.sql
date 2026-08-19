IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeyUsageLogs', N'U') AND name = N'IX_ApiKeyUsageLogs_ApiKeyId')
BEGIN
    CREATE INDEX [IX_ApiKeyUsageLogs_ApiKeyId] ON [dbo].[ApiKeyUsageLogs] ([ApiKeyId]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeyUsageLogs', N'U') AND name = N'IX_ApiKeyUsageLogs_StatusCode')
BEGIN
    CREATE INDEX [IX_ApiKeyUsageLogs_StatusCode] ON [dbo].[ApiKeyUsageLogs] ([StatusCode]);
END