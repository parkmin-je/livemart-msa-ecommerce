-- LiveMart Database Initialization Script
-- Creates all required databases for microservices

-- User Service Database
CREATE DATABASE IF NOT EXISTS userdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Product Service Database
CREATE DATABASE IF NOT EXISTS productdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Order Service Database
CREATE DATABASE IF NOT EXISTS orderdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Show created databases
SHOW DATABASES;
