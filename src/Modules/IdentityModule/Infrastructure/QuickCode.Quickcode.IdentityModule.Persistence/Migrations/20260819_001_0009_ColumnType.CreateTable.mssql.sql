IF OBJECT_ID(N'dbo.ColumnTypes', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ColumnTypes] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [TypeName] nvarchar(250) NOT NULL,
        [IosComponentName] nvarchar(250) NOT NULL,
        [IosType] nvarchar(250) NOT NULL,
        [IconCode] nvarchar(250) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_ColumnTypes] PRIMARY KEY ([Id])
    );
END;