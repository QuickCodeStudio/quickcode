IF OBJECT_ID(N'dbo.PROJECT_ANALYSES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_ANALYSES] (
        [ID] uniqueidentifier NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [ANALYSIS_ID] nvarchar(250) NOT NULL,
        [STATUS] nvarchar(50) NOT NULL,
        [LANGUAGE] nvarchar(250) NOT NULL,
        [PAYLOAD] nvarchar(max) NOT NULL,
        [PROVIDER] nvarchar(250) NOT NULL,
        [ORIGINAL_PROMPT] nvarchar(max) NOT NULL,
        [IS_CURRENT] bit NOT NULL DEFAULT 0,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [UPDATED_DATE] datetime2(7) NULL,
        CONSTRAINT [PK_PROJECT_ANALYSES] PRIMARY KEY ([ID])
    );
END;