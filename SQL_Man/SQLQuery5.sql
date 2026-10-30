-- 1. Crear la base de datos (si no la tenías creada)
CREATE DATABASE AppPedroDB;
GO

USE AppPedroDB;
GO

-- 2. Tabla para almacenar las rutinas de entrenamiento por día y sus series (JSON)
CREATE TABLE Rutinas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DiaSemana INT NOT NULL,
    NombreEjercicio NVARCHAR(255) NOT NULL,
    SetsJson NVARCHAR(MAX) NOT NULL
);
GO

-- 3. Tabla para el registro de asistencia del calendario
CREATE TABLE Asistencia (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Fecha DATE NOT NULL,
    Asistio BIT NOT NULL
);
GO

-- 4. Tabla para el buscador de alimentos de la sección nutricional
CREATE TABLE Alimentos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(255) NOT NULL,
    Calorias FLOAT NOT NULL,
    Proteinas FLOAT NOT NULL,
    Carbohidratos FLOAT NOT NULL,
    Grasas FLOAT NOT NULL
);
GO

-- 5. Tabla para los récords y progresos
CREATE TABLE Progresos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Ejercicio NVARCHAR(255) NOT NULL,
    PesoMaximo FLOAT NOT NULL
);
GO

-- (Opcional) Ejemplo de inserción de algunos alimentos base para probar el buscador
INSERT INTO Alimentos (Nombre, Calorias, Proteinas, Carbohidratos, Grasas) VALUES 
('Pechuga de Pollo (cocida)', 165, 31.0, 0.0, 3.6),
('Arroz Blanco (cocido)', 130, 2.7, 28.0, 0.3),
('Huevo Entero', 155, 13.0, 1.1, 11.0),
('Avena', 389, 16.9, 66.3, 6.9),
('Leche Descremada', 35, 3.4, 5.0, 0.1);
GO