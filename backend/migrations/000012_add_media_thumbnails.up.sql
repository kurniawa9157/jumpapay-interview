-- Tambah flag has_thumbnails di tt_media_files. Saat upload image
-- (jpeg/png), backend generate 3 variant (thumb 300w, medium 800w,
-- large 1600w) di subdir uploads/{thumb,medium,large}/. Untuk file
-- existing sebelum migration ini, default false → frontend fallback
-- ke URL original.
ALTER TABLE tt_media_files ADD COLUMN has_thumbnails BOOLEAN NOT NULL DEFAULT FALSE;
