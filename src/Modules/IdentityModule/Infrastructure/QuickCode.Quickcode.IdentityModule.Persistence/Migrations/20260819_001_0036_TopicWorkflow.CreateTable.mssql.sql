IF OBJECT_ID(N'dbo.TopicWorkflows', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TopicWorkflows] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [KafkaEventsTopicName] nvarchar(450) NOT NULL,
        [WorkflowContent] nvarchar(max) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_TopicWorkflows] PRIMARY KEY ([Id])
    );
END;