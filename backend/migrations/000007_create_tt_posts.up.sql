-- Posts — content blog/article/news. Tidak pakai EAV karena perlu query
-- (filter status, type, tag, sort by published_at).

CREATE TABLE tt_posts (
  id           BIGSERIAL PRIMARY KEY,
  slug         VARCHAR(255) UNIQUE NOT NULL,
  title        VARCHAR(255) NOT NULL,
  excerpt      TEXT,
  content      TEXT,
  cover_image  VARCHAR(500),
  type         VARCHAR(20) NOT NULL DEFAULT 'post',     -- post | page
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',    -- draft | published | archived
  tags         TEXT,
  sequence     INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  author_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX idx_posts_published ON tt_posts(status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_type ON tt_posts(type) WHERE deleted_at IS NULL;
