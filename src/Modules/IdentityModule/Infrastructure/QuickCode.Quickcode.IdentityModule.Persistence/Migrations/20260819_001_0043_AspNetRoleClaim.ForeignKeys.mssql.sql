IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AspNetRoleClaims_AspNetRoles_RoleId' AND parent_object_id = OBJECT_ID(N'dbo.AspNetRoleClaims'))
BEGIN
    ALTER TABLE [dbo].[AspNetRoleClaims] ADD CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[AspNetRoles] ([Id]);
END