IF OBJECT_ID(N'dbo.PortalMenus', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PortalMenus] (
        [Key] nvarchar(450) NOT NULL,
        [Name] nvarchar(250) NOT NULL,
        [Text] nvarchar(250) NOT NULL,
        [Tooltip] nvarchar(250) NOT NULL,
        [ActionName] nvarchar(250) NOT NULL,
        [OrderNo] int NOT NULL,
        [ParentName] nvarchar(250) NOT NULL,
        CONSTRAINT [PK_PortalMenus] PRIMARY KEY ([Key])
    );
END;