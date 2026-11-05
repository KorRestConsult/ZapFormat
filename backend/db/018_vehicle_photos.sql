BEGIN;
-- Customer-uploaded garage photos belong to the owner and vehicle.
-- Photo content is a small EXIF-stripped JPEG, never a public URL.
CREATE TABLE IF NOT EXISTS vehicle_photos (
  vehicle_id uuid PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_data bytea NOT NULL CHECK (octet_length(image_data) <= 235520),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_photos_user_idx ON vehicle_photos(user_id);
COMMIT;
