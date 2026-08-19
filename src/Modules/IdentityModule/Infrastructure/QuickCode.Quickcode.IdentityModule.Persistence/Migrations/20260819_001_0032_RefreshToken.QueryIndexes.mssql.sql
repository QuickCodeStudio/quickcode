IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RefreshTokens', N'U') AND name = N'IX_RefreshTokens_IsRevoked_ExpiryDate')
BEGIN
    CREATE INDEX [IX_RefreshTokens_IsRevoked_ExpiryDate] ON [dbo].[RefreshTokens] ([IsRevoked], [ExpiryDate]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RefreshTokens', N'U') AND name = N'IX_RefreshTokens_UserId')
BEGIN
    CREATE INDEX [IX_RefreshTokens_UserId] ON [dbo].[RefreshTokens] ([UserId]);
END