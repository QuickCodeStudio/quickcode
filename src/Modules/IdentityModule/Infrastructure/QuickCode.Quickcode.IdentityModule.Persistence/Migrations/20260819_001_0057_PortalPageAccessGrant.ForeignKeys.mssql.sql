IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PortalPageAccessGrants_PermissionGroups_PermissionGroupName' AND parent_object_id = OBJECT_ID(N'dbo.PortalPageAccessGrants'))
BEGIN
    ALTER TABLE [dbo].[PortalPageAccessGrants] ADD CONSTRAINT [FK_PortalPageAccessGrants_PermissionGroups_PermissionGroupName] FOREIGN KEY ([PermissionGroupName]) REFERENCES [dbo].[PermissionGroups] ([Name]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PortalPageAccessGrants_PortalPageDefinitions_PortalPageDefinitionKey' AND parent_object_id = OBJECT_ID(N'dbo.PortalPageAccessGrants'))
BEGIN
    ALTER TABLE [dbo].[PortalPageAccessGrants] ADD CONSTRAINT [FK_PortalPageAccessGrants_PortalPageDefinitions_PortalPageDefinitionKey] FOREIGN KEY ([PortalPageDefinitionKey]) REFERENCES [dbo].[PortalPageDefinitions] ([Key]);
END