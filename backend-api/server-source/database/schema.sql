-- Справочник услуг и базового времени (в минутах для точности расчетов)
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    base_time_minutes INT NOT NULL -- Например: 360 (для 6 часов)
);

-- Таблица Клиентов
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    default_address TEXT,
    blacklist_cleaner_ids INT[], -- Массив ID клинеров, которых нельзя назначать
    favorite_cleaner_ids INT[]   -- Массив ID любимых клинеров
);

-- Таблица Клинеров
CREATE TABLE cleaners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    home_address TEXT,
    lat NUMERIC(9, 6), -- Для карты дня
    lon NUMERIC(9, 6), -- Для карты дня
    tags VARCHAR(100)[], -- Например: ['без_генералок', 'аллергия_на_кошек']
    incompatible_cleaner_ids INT[], -- Массив ID напарников, с кем конфликт
    status VARCHAR(50) DEFAULT 'active' -- active, day_off, inactive
);

-- Таблица Заказов (Воронка статусов)
CREATE TYPE order_status AS ENUM (
    'new_lead', 
    'in_progress', 
    'finding_cleaner', 
    'assigned', 
    'completed', 
    'cancelled'
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    status order_status DEFAULT 'new_lead',
    address TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Рассчитывается автоматически
    base_duration_minutes INT NOT NULL, -- Длительность "в человеко-часах"
    price DECIMAL(10, 2) NOT NULL,
    needs_vacuum BOOLEAN DEFAULT FALSE,
    has_pets BOOLEAN DEFAULT FALSE,
    keys_action VARCHAR(100), -- 'забрать', 'оставить', null
    client_instructions TEXT,
    photos TEXT[], -- Ссылки на фото в S3/Cloudinary
    cancel_reason TEXT
);

-- Промежуточная таблица связи Заказов и Клинеров (многие-ко-многим)
CREATE TABLE order_cleaners (
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    cleaner_id INT REFERENCES cleaners(id) ON DELETE CASCADE,
    is_confirmed BOOLEAN DEFAULT FALSE, -- Статус кнопки "Приняла" в TG-боте
    PRIMARY KEY (order_id, cleaner_id)
);
