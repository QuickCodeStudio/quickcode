IF OBJECT_ID(N'dbo.PROJECT_MODULE_REVISIONS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_MODULE_REVISIONS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [MODULE_NAME] nvarchar(250) NOT NULL,
        [MODULE_TEMPLATE_KEY] nvarchar(250) NOT NULL,
        [REVISION] int NOT NULL,
        [DBML] nvarchar(max) NOT NULL,
        [SOURCE] nvarchar(50) NOT NULL,
        [ANALYSIS_ID] nvarchar(250) NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_PROJECT_MODULE_REVISIONS] PRIMARY KEY ([ID])
    );
END;