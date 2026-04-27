-- Tambah kolom cover_aspect untuk control rasio tinggi cover image di
-- post detail page. Nilai = persentase tinggi terhadap lebar (padding-
-- bottom CSS trick), atau 'auto' untuk pakai ukuran asli image.
--
-- Pilihan UX di admin: auto, 30, 40, 50, 60 (~16:9), 75 (~4:3), 100 (1:1).
ALTER TABLE tt_posts ADD COLUMN cover_aspect VARCHAR(10) NOT NULL DEFAULT 'auto';
