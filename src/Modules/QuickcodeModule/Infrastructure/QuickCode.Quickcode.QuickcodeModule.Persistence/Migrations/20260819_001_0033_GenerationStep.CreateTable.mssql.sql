IF OBJECT_ID(N'dbo.GENERATION_STEPS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GENERATION_STEPS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [NAME] nvarchar(250) NOT NULL,
        [WAITING_MESSAGE] nvarchar(250) NOT NULL,
        [IN_PROGRESS_MESSAGE] nvarchar(250) NOT NULL,
        [COMPLETED_MESSAGE] nvarchar(250) NOT NULL,
        [DESCRIPTION] nvarchar(max) NOT NULL,
        [ICON] nvarchar(250) NOT NULL,
        [NEEDS] nvarchar(250) NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_GENERATION_STEPS] PRIMARY KEY ([ID])
    );
END;