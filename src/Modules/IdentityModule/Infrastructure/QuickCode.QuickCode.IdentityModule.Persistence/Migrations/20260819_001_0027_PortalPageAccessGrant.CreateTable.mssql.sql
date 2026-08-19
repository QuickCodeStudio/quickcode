IF OBJECT_ID(N'dbo.PortalPageAccessGrants', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PortalPageAccessGrants] (
        [PermissionGroupName] nvarchar(450) NOT NULL,
        [PortalPageDefinitionKey] nvarchar(450) NOT NULL,
        [PageAction] nvarchar(50) NOT NULL,
        [ModifiedBy] nvarchar(50) NOT NULL DEFAULT 'System',
        [IsActive] bit NOT NULL DEFAULT 0,
        CONSTRAINT [PK_PortalPageAccessGrants] PRIMARY KEY ([PermissionGroupName], [PortalPageDefinitionKey], [PageAction])
    );
END;