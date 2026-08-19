IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiMethodDefinitions_Modules_ModuleName' AND parent_object_id = OBJECT_ID(N'dbo.ApiMethodDefinitions'))
BEGIN
    ALTER TABLE [dbo].[ApiMethodDefinitions] ADD CONSTRAINT [FK_ApiMethodDefinitions_Modules_ModuleName] FOREIGN KEY ([ModuleName]) REFERENCES [dbo].[Modules] ([Name]);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ApiMethodDefinitions_Models_ModelName_ModuleName' AND parent_object_id = OBJECT_ID(N'dbo.ApiMethodDefinitions'))
BEGIN
    ALTER TABLE [dbo].[ApiMethodDefinitions] ADD CONSTRAINT [FK_ApiMethodDefinitions_Models_ModelName_ModuleName] FOREIGN KEY ([ModelName], [ModuleName]) REFERENCES [dbo].[Models] ([Name], [ModuleName]);
END