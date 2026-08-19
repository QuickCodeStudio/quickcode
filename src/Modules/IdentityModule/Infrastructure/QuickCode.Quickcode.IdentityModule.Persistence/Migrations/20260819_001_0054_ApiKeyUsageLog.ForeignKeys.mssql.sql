IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiKeyUsageLogs_ApiKeys_ApiKeyId' AND parent_object_id = OBJECT_ID(N'dbo.ApiKeyUsageLogs'))
BEGIN
    ALTER TABLE [dbo].[ApiKeyUsageLogs] ADD CONSTRAINT [FK_ApiKeyUsageLogs_ApiKeys_ApiKeyId] FOREIGN KEY ([ApiKeyId]) REFERENCES [dbo].[ApiKeys] ([Id]);
END