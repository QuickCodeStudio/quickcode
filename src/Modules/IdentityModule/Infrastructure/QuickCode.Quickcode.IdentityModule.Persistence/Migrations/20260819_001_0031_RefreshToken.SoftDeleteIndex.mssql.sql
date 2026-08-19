IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RefreshTokens', N'U') AND name = N'IX_RefreshTokens_IsDeleted')
BEGIN
    CREATE INDEX [IX_RefreshTokens_IsDeleted] ON [dbo].[RefreshTokens] ([IsDeleted]);
END