IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiMethodAccessGrants', N'U') AND name = N'IX_ApiMethodAccessGrants_IsActive')
BEGIN
    CREATE INDEX [IX_ApiMethodAccessGrants_IsActive] ON [dbo].[ApiMethodAccessGrants] ([IsActive]);
END