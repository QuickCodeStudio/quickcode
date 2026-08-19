IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiMethodAccessGrants_PermissionGroups_PermissionGroupName' AND parent_object_id = OBJECT_ID(N'dbo.ApiMethodAccessGrants'))
BEGIN
    ALTER TABLE [dbo].[ApiMethodAccessGrants] ADD CONSTRAINT [FK_ApiMethodAccessGrants_PermissionGroups_PermissionGroupName] FOREIGN KEY ([PermissionGroupName]) REFERENCES [dbo].[PermissionGroups] ([Name]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiMethodAccessGrants_ApiMethodDefinitions_ApiMethodDefinitionKey' AND parent_object_id = OBJECT_ID(N'dbo.ApiMethodAccessGrants'))
BEGIN
    ALTER TABLE [dbo].[ApiMethodAccessGrants] ADD CONSTRAINT [FK_ApiMethodAccessGrants_ApiMethodDefinitions_ApiMethodDefinitionKey] FOREIGN KEY ([ApiMethodDefinitionKey]) REFERENCES [dbo].[ApiMethodDefinitions] ([Key]);
END