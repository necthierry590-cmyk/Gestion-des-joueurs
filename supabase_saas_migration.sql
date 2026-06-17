-- ============================================================
-- UlcySportPro (USP) — Migration SaaS
-- À exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Table CLUBS (un club = un tenant)
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'gratuit', -- 'gratuit', 'pro', 'premium'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended'
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table PAYMENTS (historique Mobile Money)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  operator TEXT NOT NULL, -- 'moov', 'airtel'
  phone TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Ajouter club_id sur users (si pas déjà fait)
ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL;

-- 4. Ajouter club_id sur players (multi-tenant)
ALTER TABLE players ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE;

-- 5. Ajouter club_id sur staff (multi-tenant)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- CLUBS: lecture publique, modification par owner uniquement
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_select" ON clubs;
CREATE POLICY "clubs_select" ON clubs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "clubs_insert" ON clubs;
CREATE POLICY "clubs_insert" ON clubs
  FOR INSERT WITH CHECK (
    owner_email = auth.email()
  );

DROP POLICY IF EXISTS "clubs_update" ON clubs;
CREATE POLICY "clubs_update" ON clubs
  FOR UPDATE USING (
    owner_email = auth.email()
    OR auth.email() = 'nectflow48@gmail.com'
  );

-- PAYMENTS: lecture/insertion par owner du club
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    club_id IN (
      SELECT id FROM clubs WHERE owner_email = auth.email()
    )
    OR auth.email() = 'nectflow48@gmail.com'
  );

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT id FROM clubs WHERE owner_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "payments_update_superadmin" ON payments;
CREATE POLICY "payments_update_superadmin" ON payments
  FOR UPDATE USING (auth.email() = 'nectflow48@gmail.com');

-- ============================================================
-- Créer le club initial pour l'admin existant
-- (Remplacez si nécessaire)
-- ============================================================

-- Insérer le club de l'admin existant (si pas déjà fait)
INSERT INTO clubs (name, plan, status, owner_email)
VALUES ('Mon Club', 'premium', 'active', 'nectflow48@gmail.com')
ON CONFLICT DO NOTHING;

-- Lier l'admin existant à ce club
UPDATE users
SET club_id = (SELECT id FROM clubs WHERE owner_email = 'nectflow48@gmail.com' LIMIT 1)
WHERE email = 'nectflow48@gmail.com'
  AND club_id IS NULL;
