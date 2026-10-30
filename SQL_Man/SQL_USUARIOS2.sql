USE FitProDB; 
GO

ALTER TABLE Usuarios ADD 
    Peso FLOAT DEFAULT 75,
    Altura FLOAT DEFAULT 175,
    Edad INT DEFAULT 20,
    Actividad FLOAT DEFAULT 1.55,
    Objetivo VARCHAR(50) DEFAULT 'mantenimiento';
GO