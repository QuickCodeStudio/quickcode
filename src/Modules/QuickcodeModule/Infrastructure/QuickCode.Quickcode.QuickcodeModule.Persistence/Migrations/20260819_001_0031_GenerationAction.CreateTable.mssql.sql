IF OBJECT_ID(N'dbo.GENERATION_ACTIONS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GENERATION_ACTIONS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [GENERATION_RUN_ID] int NOT NULL,
        [GENERATION_STEP_ID] int NOT NULL,
        [STEP_PARAMETERS] nvarchar(max) NOT NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [START_DATE] datetime2(7) NULL,
        [END_DATE] datetime2(7) NULL,
        [ELAPSED_TIME] int NULL,
        [OUTPUT_MESSAGE] nvarchar(max) NULL,
        [IS_COMPLETED] bit NOT NULL DEFAULT 0,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_GENERATION_ACTIONS] PRIMARY KEY ([ID])
    );
END;