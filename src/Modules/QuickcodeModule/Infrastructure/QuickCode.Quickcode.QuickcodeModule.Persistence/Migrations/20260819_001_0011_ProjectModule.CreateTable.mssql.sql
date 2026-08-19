IF OBJECT_ID(N'dbo.PROJECT_MODULES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_MODULES] (
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [MODULE_NAME] nvarchar(250) NOT NULL,
        [MODULE_TEMPLATE_KEY] nvarchar(250) NOT NULL,
        [DBML] nvarchar(max) NOT NULL,
        [DB_TYPE_KEY] nvarchar(250) NOT NULL,
        [ARCHITECTURAL_PATTERN_KEY] nvarchar(250) NOT NULL,
        [DESCRIPTION] nvarchar(max) NOT NULL,
        [INITIAL_DATA] nvarchar(max) NOT NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [UPDATED_DATE] datetime2(7) NULL,
        CONSTRAINT [PK_PROJECT_MODULES] PRIMARY KEY ([PROJECT_ID], [MODULE_NAME], [MODULE_TEMPLATE_KEY])
    );
END;