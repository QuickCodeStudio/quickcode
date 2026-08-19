IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeys', N'U') AND name = N'IX_ApiKeys_CreatedByUserId')
BEGIN
    CREATE INDEX [IX_ApiKeys_CreatedByUserId] ON [dbo].[ApiKeys] ([CreatedByUserId]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeys', N'U') AND name = N'IX_ApiKeys_KeyPrefix_IsActive_Status')
BEGIN
    CREATE INDEX [IX_ApiKeys_KeyPrefix_IsActive_Status] ON [dbo].[ApiKeys] ([KeyPrefix], [IsActive], [Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeys', N'U') AND name = N'IX_ApiKeys_PermissionGroupName')
BEGIN
    CREATE INDEX [IX_ApiKeys_PermissionGroupName] ON [dbo].[ApiKeys] ([PermissionGroupName]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeys', N'U') AND name = N'IX_ApiKeys_Status')
BEGIN
    CREATE INDEX [IX_ApiKeys_Status] ON [dbo].[ApiKeys] ([Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiKeys', N'U') AND name = N'UX_ApiKeys_Name')
BEGIN
    CREATE UNIQUE INDEX [UX_ApiKeys_Name] ON [dbo].[ApiKeys] ([Name]);
END