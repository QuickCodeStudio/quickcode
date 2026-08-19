IF OBJECT_ID(N'dbo.PROJECT_SCHEMA_SNAPSHOTS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PROJECT_SCHEMA_SNAPSHOTS] (
        [ID] uniqueidentifier NOT NULL,
        [PROJECT_ID] uniqueidentifier NOT NULL,
        [LABEL] nvarchar(250) NOT NULL,
        [TRIGGER] nvarchar(50) NOT NULL,
        [MODULES_JSON] nvarchar(max) NOT NULL,
        [ANALYSIS_ID] nvarchar(250) NULL,
        [CREATED_DATE] datetime2(7) NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_PROJECT_SCHEMA_SNAPSHOTS] PRIMARY KEY ([ID])
    );
END;