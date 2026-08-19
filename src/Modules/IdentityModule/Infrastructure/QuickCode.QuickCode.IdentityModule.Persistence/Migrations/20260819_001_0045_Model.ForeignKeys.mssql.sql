IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Models_Modules_ModuleName' AND parent_object_id = OBJECT_ID(N'dbo.Models'))
BEGIN
    ALTER TABLE [dbo].[Models] ADD CONSTRAINT [FK_Models_Modules_ModuleName] FOREIGN KEY ([ModuleName]) REFERENCES [dbo].[Modules] ([Name]);
END