IF OBJECT_ID(N'dbo.PermissionGroups', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PermissionGroups] (
        [Name] nvarchar(450) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_PermissionGroups] PRIMARY KEY ([Name])
    );
END;