IF OBJECT_ID(N'dbo.PROJECT_MODULE_PROMPTS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_MODULE_PROMPTS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [MODULE_NAME] nvarchar(250) NOT NULL,
        [AI_TYPE] nvarchar(250) NOT NULL,
        [USER_PROMPT] nvarchar(max) NOT NULL,
        [SYSTEM_PROMPT] nvarchar(max) NOT NULL,
        [AI_RESPONSE] nvarchar(max) NOT NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [UPDATED_DATE] datetime2(7) NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_PROJECT_MODULE_PROMPTS] PRIMARY KEY ([ID], [MODULE_NAME], [AI_TYPE])
    );
END;