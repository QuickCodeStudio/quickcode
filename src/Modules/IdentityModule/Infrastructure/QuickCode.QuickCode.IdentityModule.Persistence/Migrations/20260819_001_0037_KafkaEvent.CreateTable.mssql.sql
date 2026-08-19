IF OBJECT_ID(N'dbo.KafkaEvents', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[KafkaEvents] (
        [TopicName] nvarchar(450) NOT NULL,
        [ApiMethodDefinitionKey] nvarchar(450) NOT NULL,
        [IsActive] bit NOT NULL DEFAULT 0,
        CONSTRAINT [PK_KafkaEvents] PRIMARY KEY ([TopicName])
    );
END;