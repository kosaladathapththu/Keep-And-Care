CREATE TABLE IF NOT EXISTS historical_reports (
 id CHAR(64) NOT NULL PRIMARY KEY,
 file_name VARCHAR(180) NOT NULL,
 period CHAR(7) NOT NULL,
 bytes INT UNSIGNED NOT NULL,
 uploaded_at VARCHAR(32) NOT NULL,
 uploaded_by VARCHAR(36) NOT NULL,
 sheet_names LONGTEXT NOT NULL,
 content LONGBLOB NOT NULL,
 INDEX historical_reports_period_idx (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
