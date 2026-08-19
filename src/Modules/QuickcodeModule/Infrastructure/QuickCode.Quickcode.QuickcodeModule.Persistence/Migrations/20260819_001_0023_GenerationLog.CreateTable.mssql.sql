IF OBJECT_ID(N'dbo.GENERATION_LOGS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GENERATION_LOGS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [GENERATION_STATUS_ID] int NOT NULL,
        [DESCRIPTION] nvarchar(max) NOT NULL,
        [ELAPSED_TIME] int NOT NULL,
        [LOG_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_GENERATION_LOGS] PRIMARY KEY ([ID])
    );
END;