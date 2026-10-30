USE FitProDB;
GO

CREATE TABLE HistorialCargas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT FOREIGN KEY REFERENCES Usuarios(Id),
    Fecha DATE,
    Ejercicio VARCHAR(255),
    PesoMaximo FLOAT
);
GO