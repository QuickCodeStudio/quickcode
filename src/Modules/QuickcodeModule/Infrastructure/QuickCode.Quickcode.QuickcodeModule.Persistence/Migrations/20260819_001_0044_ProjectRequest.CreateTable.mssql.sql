IF OBJECT_ID(N'dbo.PROJECT_REQUESTS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_REQUESTS] (
        [ID] uniqueidentifier NOT NULL,
        [PROJECT_NAME] nvarchar(250) NOT NULL,
        [EMAIL] nvarchar(500) NOT NULL,
        [PROMPT] nvarchar(max) NOT NULL,
        [PROVIDER] nvarchar(250) NOT NULL,
        [DOCUMENT_STORAGE_KEY] nvarchar(250) NULL,
        [DOCUMENT_FILE_NAME] nvarchar(250) NULL,
        [TOKEN_HASH] nvarchar(250) NOT NULL,
        [EXPIRES_AT] datetime2(7) NOT NULL,
        [STATUS] nvarchar(50) NOT NULL,
        [RESEND_COUNT] int NOT NULL DEFAULT 0,
        [CONFIRMED_AT] datetime2(7) NULL,
        [PROJECT_ID] uniqueidentifier NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [UPDATED_DATE] datetime2(7) NULL,
        CONSTRAINT [PK_PROJECT_REQUESTS] PRIMARY KEY ([ID])
    );
END;