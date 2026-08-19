IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiMethodDefinitions', N'U') AND name = N'IX_ApiMethodDefinitions_ModelName')
BEGIN
    CREATE INDEX [IX_ApiMethodDefinitions_ModelName] ON [dbo].[ApiMethodDefinitions] ([ModelName]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ApiMethodDefinitions', N'U') AND name = N'IX_ApiMethodDefinitions_ModuleName')
BEGIN
    CREATE INDEX [IX_ApiMethodDefinitions_ModuleName] ON [dbo].[ApiMethodDefinitions] ([ModuleName]);
END