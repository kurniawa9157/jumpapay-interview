-- Page Builder mode untuk type='page'. use_builder=true → render
-- public pakai page_layout JSON (BuilderComponent[]) lewat
-- BlockRenderer; false → render content HTML lewat RichTextEditor
-- output (perilaku existing).
ALTER TABLE tt_posts
  ADD COLUMN use_builder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN page_layout TEXT;
