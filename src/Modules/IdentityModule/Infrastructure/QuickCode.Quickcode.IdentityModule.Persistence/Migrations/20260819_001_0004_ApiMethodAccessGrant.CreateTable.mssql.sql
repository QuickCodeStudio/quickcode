IF OBJECT_ID(N'dbo.ApiMethodAccessGrants', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApiMethodAccessGrants] (
        [PermissionGroupName] nvarchar(450) NOT NULL,
        [ApiMethodDefinitionKey] nvarchar(450) NOT NULL,
        [ModifiedBy] nvarchar(50) NOT NULL DEFAULT 'System',
        [IsActive] bit NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ApiMethodAccessGrants] PRIMARY KEY ([PermissionGroupName], [ApiMethodDefinitionKey])
    );
END;