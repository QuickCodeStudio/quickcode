IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.KafkaEvents', N'U') AND name = N'IX_KafkaEvents_ApiMethodDefinitionKey')
BEGIN
    CREATE INDEX [IX_KafkaEvents_ApiMethodDefinitionKey] ON [dbo].[KafkaEvents] ([ApiMethodDefinitionKey]);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.KafkaEvents', N'U') AND name = N'IX_KafkaEvents_IsActive')
BEGIN
    CREATE INDEX [IX_KafkaEvents_IsActive] ON [dbo].[KafkaEvents] ([IsActive]);
END