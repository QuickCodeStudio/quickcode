IF OBJECT_ID(N'dbo.DB_TYPES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DB_TYPES] (
        [KEY] nvarchar(250) NOT NULL,
        [NAME] nvarchar(250) NOT NULL,
        [DESCRIPTION] nvarchar(max) NOT NULL,
        [ICON_URL] nvarchar(500) NOT NULL,
        CONSTRAINT [PK_DB_TYPES] PRIMARY KEY ([KEY])
    );
END;