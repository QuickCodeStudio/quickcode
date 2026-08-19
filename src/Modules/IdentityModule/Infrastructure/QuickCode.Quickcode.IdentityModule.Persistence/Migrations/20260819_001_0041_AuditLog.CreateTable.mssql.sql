IF OBJECT_ID(N'dbo.AUDIT_LOGS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AUDIT_LOGS] (
        [ID] uniqueidentifier NOT NULL,
        [ENTITY_NAME] nvarchar(250) NOT NULL,
        [ENTITY_ID] nvarchar(250) NOT NULL,
        [ACTION] nvarchar(50) NOT NULL,
        [USER_ID] nvarchar(250) NULL,
        [USER_NAME] nvarchar(250) NULL,
        [USER_GROUP] nvarchar(250) NULL,
        [TIMESTAMP] datetime2(7) NOT NULL,
        [DURATION_MS] int NULL,
        [STATUS_CODE] int NULL,
        [REQUEST_MODULE] nvarchar(150) NULL,
        [REQUEST_PATH] nvarchar(500) NULL,
        [OLD_VALUES] nvarchar(max) NULL,
        [NEW_VALUES] nvarchar(max) NULL,
        [CHANGED_COLUMNS] nvarchar(max) NULL,
        [IS_CHANGED] bit NULL DEFAULT 0,
        [CHANGE_SUMMARY] nvarchar(max) NULL,
        [IP_ADDRESS] nvarchar(50) NULL,
        [USER_AGENT] nvarchar(500) NULL,
        [CORRELATION_ID] nvarchar(100) NULL,
        [IS_SUCCESS] bit NULL DEFAULT 0,
        [ERROR_MESSAGE] nvarchar(max) NULL,
        [HASH] nvarchar(128) NULL,
        CONSTRAINT [PK_AUDIT_LOGS] PRIMARY KEY ([ID])
    );
END;