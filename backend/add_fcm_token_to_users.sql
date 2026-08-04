-- Migration to add fcmToken to Users table for Firebase Cloud Messaging
ALTER TABLE Users
ADD COLUMN fcmToken VARCHAR(255) DEFAULT NULL;

-- Optional: Create an index on fcmToken to optimize token lookups
CREATE INDEX idx_users_fcm_token ON Users(fcmToken);
