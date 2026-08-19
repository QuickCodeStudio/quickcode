IF OBJECT_ID(N'dbo.PortalPageDefinitions', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PortalPageDefinitions] (
        [Key] nvarchar(450) NOT NULL,
        [ModuleName] nvarchar(450) NOT NULL,
        [ModelName] nvarchar(450) NOT NULL,
        [PageAction] nvarchar(50) NOT NULL,
        [PagePath] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_PortalPageDefinitions] PRIMARY KEY ([Key])
    );
END;