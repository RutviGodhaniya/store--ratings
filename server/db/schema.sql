-- Core data model for the store ratings application.

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(60) NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  address VARCHAR(400) NOT NULL CHECK (char_length(address) <= 400),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user', 'store_owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(60) NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email VARCHAR(254) NOT NULL UNIQUE,
  address VARCHAR(400) NOT NULL CHECK (char_length(address) <= 400),
  owner_user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_rating_per_user_per_store UNIQUE (user_id, store_id)
);

CREATE INDEX users_name_idx ON users (name);
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX stores_name_idx ON stores (name);
CREATE INDEX ratings_store_id_idx ON ratings (store_id);
CREATE INDEX ratings_user_id_idx ON ratings (user_id);
