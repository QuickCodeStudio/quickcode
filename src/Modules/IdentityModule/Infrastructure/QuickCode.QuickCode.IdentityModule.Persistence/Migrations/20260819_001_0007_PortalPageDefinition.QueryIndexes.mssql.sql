IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PortalPageDefinitions', N'U') AND name = N'IX_PortalPageDefinitions_ModelName')
BEGIN
    CREATE INDEX [IX_PortalPageDefinitions_ModelName] ON [dbo].[PortalPageDefinitions] ([ModelName]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PortalPageDefinitions', N'U') AND name = N'IX_PortalPageDefinitions_ModuleName')
BEGIN
    CREATE INDEX [IX_PortalPageDefinitions_ModuleName] ON [dbo].[PortalPageDefinitions] ([ModuleName]);
END