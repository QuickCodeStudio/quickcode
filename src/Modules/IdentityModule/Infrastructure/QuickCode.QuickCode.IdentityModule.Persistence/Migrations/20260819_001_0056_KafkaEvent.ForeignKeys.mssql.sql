IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_KafkaEvents_ApiMethodDefinitions_ApiMethodDefinitionKey' AND parent_object_id = OBJECT_ID(N'dbo.KafkaEvents'))
BEGIN
    ALTER TABLE [dbo].[KafkaEvents] ADD CONSTRAINT [FK_KafkaEvents_ApiMethodDefinitions_ApiMethodDefinitionKey] FOREIGN KEY ([ApiMethodDefinitionKey]) REFERENCES [dbo].[ApiMethodDefinitions] ([Key]);
END