IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PortalPageDefinitions_Modules_ModuleName' AND parent_object_id = OBJECT_ID(N'dbo.PortalPageDefinitions'))
BEGIN
    ALTER TABLE [dbo].[PortalPageDefinitions] ADD CONSTRAINT [FK_PortalPageDefinitions_Modules_ModuleName] FOREIGN KEY ([ModuleName]) REFERENCES [dbo].[Modules] ([Name]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PortalPageDefinitions_Models_ModelName_ModuleName' AND parent_object_id = OBJECT_ID(N'dbo.PortalPageDefinitions'))
BEGIN
    ALTER TABLE [dbo].[PortalPageDefinitions] ADD CONSTRAINT [FK_PortalPageDefinitions_Models_ModelName_ModuleName] FOREIGN KEY ([ModelName], [ModuleName]) REFERENCES [dbo].[Models] ([Name], [ModuleName]);
END