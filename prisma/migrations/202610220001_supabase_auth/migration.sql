-- Link verified Supabase Auth identities to existing application users without
-- changing their IDs or deleting their related data.
ALTER TABLE "User" ADD COLUMN "authId" UUID;
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");
