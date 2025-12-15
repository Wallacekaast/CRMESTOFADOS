PRAGMA journal_mode;
PRAGMA wal_checkpoint(FULL);

SELECT name FROM sqlite_master WHERE type='table';
SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index';

SELECT * FROM users LIMIT 50;
SELECT * FROM members LIMIT 50;
SELECT * FROM products LIMIT 50;
SELECT * FROM sales LIMIT 50;
SELECT * FROM catalog_orders ORDER BY created_at DESC LIMIT 50;

UPDATE users SET role='admin' WHERE lower(email)='davelnetbr@gmail.com';
UPDATE members SET active=1 WHERE lower(email)='davelnetbr@gmail.com';
