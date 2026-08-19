IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PortalPageAccessGrants', N'U') AND name = N'IX_PortalPageAccessGrants_IsActive')
BEGIN
    CREATE INDEX [IX_PortalPageAccessGrants_IsActive] ON [dbo].[PortalPageAccessGrants] ([IsActive]);
END