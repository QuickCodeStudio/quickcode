IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AspNetUsers_PermissionGroups_PermissionGroupName' AND parent_object_id = OBJECT_ID(N'dbo.AspNetUsers'))
BEGIN
    ALTER TABLE [dbo].[AspNetUsers] ADD CONSTRAINT [FK_AspNetUsers_PermissionGroups_PermissionGroupName] FOREIGN KEY ([PermissionGroupName]) REFERENCES [dbo].[PermissionGroups] ([Name]);
END