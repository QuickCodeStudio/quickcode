IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers', N'U') AND name = N'IX_AspNetUsers_Email')
BEGIN
    CREATE INDEX [IX_AspNetUsers_Email] ON [dbo].[AspNetUsers] ([Email]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers', N'U') AND name = N'IX_AspNetUsers_NormalizedEmail')
BEGIN
    CREATE INDEX [IX_AspNetUsers_NormalizedEmail] ON [dbo].[AspNetUsers] ([NormalizedEmail]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers', N'U') AND name = N'IX_AspNetUsers_NormalizedUserName')
BEGIN
    CREATE INDEX [IX_AspNetUsers_NormalizedUserName] ON [dbo].[AspNetUsers] ([NormalizedUserName]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers', N'U') AND name = N'IX_AspNetUsers_PermissionGroupName')
BEGIN
    CREATE INDEX [IX_AspNetUsers_PermissionGroupName] ON [dbo].[AspNetUsers] ([PermissionGroupName]);
END