IF OBJECT_ID(N'dbo.PROJECTS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECTS] (
        [ID] uniqueidentifier NOT NULL,
        [KEY] nvarchar(250) NOT NULL,
        [NAME] nvarchar(250) NOT NULL,
        [EMAIL] nvarchar(500) NULL,
        [GENERATION_STATUS_ID] int NOT NULL,
        [SECRET_CODE] nvarchar(250) NOT NULL,
        [DESCRIPTION] nvarchar(max) NOT NULL,
        [IS_ACTIVE] bit NOT NULL DEFAULT 0,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [UPDATED_DATE] datetime2(7) NOT NULL,
        CONSTRAINT [PK_PROJECTS] PRIMARY KEY ([ID])
    );
END;