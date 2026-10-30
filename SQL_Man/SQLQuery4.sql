USE FitProDB;
GO

-- Tabla para guardar los ejercicios y series personalizados por día
CREATE TABLE RutinasEntrenamiento (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DiaSemana INT NOT NULL, -- Día 1, Día 2, etc.
    NombreEjercicio VARCHAR(150) NOT NULL,
    SetsJson VARCHAR(MAX) NOT NULL -- Guarda las series, kg y repeticiones en formato JSON
);
GO

-- Tabla para guardar el calendario de asistencia
CREATE TABLE AsistenciaGimnasio (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Fecha DATE NOT NULL UNIQUE,
    Asistio BIT NOT NULL DEFAULT 1
);
GO