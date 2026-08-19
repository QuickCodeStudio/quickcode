IF OBJECT_ID(N'dbo.ApiMethodDefinitions', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApiMethodDefinitions] (
        [Key] nvarchar(450) NOT NULL,
        [ModuleName] nvarchar(450) NOT NULL,
        [ModelName] nvarchar(450) NOT NULL,
        [HttpMethod] nvarchar(50) NOT NULL,
        [ControllerName] nvarchar(1000) NOT NULL,
        [MethodName] nvarchar(1000) NOT NULL,
        [UrlPath] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_ApiMethodDefinitions] PRIMARY KEY ([Key])
    );
END;