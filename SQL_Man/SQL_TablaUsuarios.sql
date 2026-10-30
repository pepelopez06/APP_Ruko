-- Tabla de Usuarios (por si te falta alguna columna)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' and xtype='U')
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Password VARCHAR(100) NOT NULL,
    Peso FLOAT DEFAULT 75,
    Altura FLOAT DEFAULT 175,
    Edad INT DEFAULT 20,
    Actividad FLOAT DEFAULT 1.55,
    Objetivo VARCHAR(50) DEFAULT 'mantenimiento'
);

-- Tabla de Rutinas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RutinasEntrenamiento' and xtype='U')
CREATE TABLE RutinasEntrenamiento (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT,
    DiaSemana INT,
    NombreEjercicio VARCHAR(150),
    SetsJson TEXT
);

-- Tabla de Asistencia
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AsistenciaGimnasio' and xtype='U')
CREATE TABLE AsistenciaGimnasio (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT,
    Fecha DATE,
    Asistio BIT
);

-- Tabla de Consumo Nutricional
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConsumoNutricional' and xtype='U')
CREATE TABLE ConsumoNutricional (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT,
    Fecha DATE,
    Nombre VARCHAR(150),
    MedidaTexto VARCHAR(100),
    Calorias INT,
    Proteinas FLOAT,
    Carbohidratos FLOAT,
    Grasas FLOAT
);

-- Tabla de Historial de Cargas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='HistorialCargas' and xtype='U')
CREATE TABLE HistorialCargas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT,
    Fecha DATE,
    Ejercicio VARCHAR(150),
    PesoMaximo FLOAT
);