IF OBJECT_ID(N'dbo.TableComboboxSettings', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TableComboboxSettings] (
        [TableName] nvarchar(250) NOT NULL,
        [IdColumn] nvarchar(250) NOT NULL,
        [TextColumns] nvarchar(max) NOT NULL,
        [StringFormat] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_TableComboboxSettings] PRIMARY KEY ([TableName])
    );
END;