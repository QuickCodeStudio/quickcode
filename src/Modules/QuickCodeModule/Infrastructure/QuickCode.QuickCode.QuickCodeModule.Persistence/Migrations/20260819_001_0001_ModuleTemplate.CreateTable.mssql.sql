IF OBJECT_ID(N'dbo.MODULE_TEMPLATES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MODULE_TEMPLATES] (
        [KEY] nvarchar(250) NOT NULL,
        [NAME] nvarchar(250) NOT NULL,
        [TEMPLATE_IMAGE] nvarchar(500) NOT NULL,
        [DESCRIPTION] nvarchar(250) NOT NULL,
        [IS_WEB_PROJECT] bit NOT NULL,
        [DBML] nvarchar(max) NOT NULL,
        [INITIAL_DATA] nvarchar(max) NOT NULL,
        [ORDER] int NOT NULL,
        CONSTRAINT [PK_MODULE_TEMPLATES] PRIMARY KEY ([KEY])
    );
END;