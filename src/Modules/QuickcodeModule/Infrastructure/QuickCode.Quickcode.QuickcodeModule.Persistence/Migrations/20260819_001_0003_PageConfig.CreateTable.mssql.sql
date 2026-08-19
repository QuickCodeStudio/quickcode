IF OBJECT_ID(N'dbo.PAGE_CONFIGS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PAGE_CONFIGS] (
        [PAGE_KEY] nvarchar(250) NOT NULL,
        [IS_ACTIVE] bit NOT NULL,
        [PAGE_CONFIG_DATA] nvarchar(max) NOT NULL,
        [PAGE_TITLE] nvarchar(250) NOT NULL,
        [PAGE_TYPE] int NOT NULL,
        CONSTRAINT [PK_PAGE_CONFIGS] PRIMARY KEY ([PAGE_KEY])
    );
END;