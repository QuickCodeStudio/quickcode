IF OBJECT_ID(N'dbo.GENERATION_RUN_TYPES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GENERATION_RUN_TYPES] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [NAME] nvarchar(250) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_GENERATION_RUN_TYPES] PRIMARY KEY ([ID])
    );
END;