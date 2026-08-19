IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiKeys_PermissionGroups_PermissionGroupName' AND parent_object_id = OBJECT_ID(N'dbo.ApiKeys'))
BEGIN
    ALTER TABLE [dbo].[ApiKeys] ADD CONSTRAINT [FK_ApiKeys_PermissionGroups_PermissionGroupName] FOREIGN KEY ([PermissionGroupName]) REFERENCES [dbo].[PermissionGroups] ([Name]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiKeys_AspNetUsers_CreatedByUserId' AND parent_object_id = OBJECT_ID(N'dbo.ApiKeys'))
BEGIN
    ALTER TABLE [dbo].[ApiKeys] ADD CONSTRAINT [FK_ApiKeys_AspNetUsers_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]);
END