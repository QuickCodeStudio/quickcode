IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ColumnTypes', N'U') AND name = N'IX_ColumnTypes_IsDeleted')
BEGIN
    CREATE INDEX [IX_ColumnTypes_IsDeleted] ON [dbo].[ColumnTypes] ([IsDeleted]);
END