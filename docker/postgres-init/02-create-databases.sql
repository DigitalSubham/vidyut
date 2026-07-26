-- vidyut_app owns both databases so it can run migrations (CREATE TABLE,
-- CREATE POLICY, ...) without needing superuser or BYPASSRLS.
ALTER DATABASE vidyut OWNER TO vidyut_app;
CREATE DATABASE vidyut_test OWNER vidyut_app;
