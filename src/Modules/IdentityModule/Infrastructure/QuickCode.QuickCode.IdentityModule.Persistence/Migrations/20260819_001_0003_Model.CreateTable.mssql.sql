IF OBJECT_ID(N'dbo.Models', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Models] (
        [Name] nvarchar(450) NOT NULL,
        [ModuleName] nvarchar(450) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_Models] PRIMARY KEY ([Name], [ModuleName])
    );
END;