IF OBJECT_ID(N'dbo.ApiKeyUsageLogs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApiKeyUsageLogs] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [ApiKeyId] uniqueidentifier NOT NULL,
        [HttpMethod] nvarchar(50) NOT NULL,
        [UrlPath] nvarchar(1000) NOT NULL,
        [StatusCode] int NOT NULL,
        [IpAddress] nvarchar(64) NULL,
        [CreatedDate] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_ApiKeyUsageLogs] PRIMARY KEY ([Id])
    );
END;