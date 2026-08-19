IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TopicWorkflows', N'U') AND name = N'IX_TopicWorkflows_IsDeleted')
BEGIN
    CREATE INDEX [IX_TopicWorkflows_IsDeleted] ON [dbo].[TopicWorkflows] ([IsDeleted]);
END