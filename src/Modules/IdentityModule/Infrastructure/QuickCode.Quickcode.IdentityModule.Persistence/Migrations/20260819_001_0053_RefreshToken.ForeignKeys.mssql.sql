IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RefreshTokens_AspNetUsers_UserId' AND parent_object_id = OBJECT_ID(N'dbo.RefreshTokens'))
BEGIN
    ALTER TABLE [dbo].[RefreshTokens] ADD CONSTRAINT [FK_RefreshTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]);
END