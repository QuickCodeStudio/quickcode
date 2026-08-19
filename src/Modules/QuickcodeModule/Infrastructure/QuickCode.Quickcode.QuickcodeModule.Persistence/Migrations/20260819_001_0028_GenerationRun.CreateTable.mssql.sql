IF OBJECT_ID(N'dbo.GENERATION_RUNS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GENERATION_RUNS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [GENERATION_RUN_TYPE_ID] int NOT NULL DEFAULT 1,
        [SESSION_ID] nvarchar(250) NOT NULL,
        [START_DATE] datetime2(7) NULL DEFAULT GETDATE(),
        [FINISH_DATE] datetime2(7) NULL,
        [IS_FINISHED] bit NULL DEFAULT 0,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_GENERATION_RUNS] PRIMARY KEY ([ID])
    );
END;