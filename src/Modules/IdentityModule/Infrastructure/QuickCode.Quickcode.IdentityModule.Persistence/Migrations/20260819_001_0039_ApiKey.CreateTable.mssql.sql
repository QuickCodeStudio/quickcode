IF OBJECT_ID(N'dbo.ApiKeys', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApiKeys] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL UNIQUE,
        [Description] nvarchar(1000) NULL,
        [KeyPrefix] nvarchar(32) NOT NULL,
        [KeyHash] nvarchar(128) NOT NULL,
        [PermissionGroupName] nvarchar(450) NOT NULL DEFAULT 'Admin',
        [CreatedByUserId] nvarchar(450) NULL,
        [Status] nvarchar(50) NOT NULL DEFAULT 'Active',
        [IsActive] bit NOT NULL DEFAULT 1,
        [ExpiresAt] datetime2(7) NOT NULL,
        [LastUsedAt] datetime2(7) NULL,
        [CreatedDate] datetime2(7) NOT NULL DEFAULT GETDATE(),
        [RevokedDate] datetime2(7) NULL,
        CONSTRAINT [PK_ApiKeys] PRIMARY KEY ([Id])
    );
END;