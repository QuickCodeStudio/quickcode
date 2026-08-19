IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TopicWorkflows_KafkaEvents_KafkaEventsTopicName' AND parent_object_id = OBJECT_ID(N'dbo.TopicWorkflows'))
BEGIN
    ALTER TABLE [dbo].[TopicWorkflows] ADD CONSTRAINT [FK_TopicWorkflows_KafkaEvents_KafkaEventsTopicName] FOREIGN KEY ([KafkaEventsTopicName]) REFERENCES [dbo].[KafkaEvents] ([TopicName]);
END