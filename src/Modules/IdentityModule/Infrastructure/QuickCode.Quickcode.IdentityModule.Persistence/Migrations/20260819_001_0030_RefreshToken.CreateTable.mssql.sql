IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RefreshTokens] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [UserId] nvarchar(450) NOT NULL,
        [Token] nvarchar(500) NOT NULL,
        [ExpiryDate] datetime2(7) NOT NULL,
        [CreatedDate] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [IsRevoked] bit NOT NULL DEFAULT 0,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id])
    );
END;