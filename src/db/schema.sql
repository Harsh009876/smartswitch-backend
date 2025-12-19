-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_or_phone_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) UNIQUE NOT NULL, -- Physical ID from ESP32 (e.g. MAC or Serial)
    device_secret VARCHAR(100) NOT NULL, -- Secret burned into factory firmware
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for factory state, set when claimed
    label VARCHAR(100) DEFAULT 'My Switchboard',
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Switches Table
CREATE TABLE IF NOT EXISTS switches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    switch_index INTEGER NOT NULL CHECK (switch_index BETWEEN 1 AND 6),
    label VARCHAR(100),
    gpio_pin INTEGER, -- Optional, mostly for backend reference if needed
    state BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, switch_index)
);

-- Index for faster lookups
CREATE INDEX idx_devices_owner ON devices(owner_id);
CREATE INDEX idx_switches_device ON switches(device_id);
