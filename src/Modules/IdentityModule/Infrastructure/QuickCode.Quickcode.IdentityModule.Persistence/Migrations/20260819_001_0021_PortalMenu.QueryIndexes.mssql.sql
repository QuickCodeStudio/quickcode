IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PortalMenus', N'U') AND name = N'IX_PortalMenus_Name')
BEGIN
    CREATE INDEX [IX_PortalMenus_Name] ON [dbo].[PortalMenus] ([Name]);
END