IF OBJECT_ID(N'dbo.Modules', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Modules] (
        [Name] nvarchar(450) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_Modules] PRIMARY KEY ([Name])
    );
END;