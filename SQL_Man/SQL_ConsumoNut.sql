USE FitProDB;
GO

CREATE TABLE ConsumoNutricional (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT FOREIGN KEY REFERENCES Usuarios(Id),
    Fecha DATE,
    Nombre VARCHAR(255),
    MedidaTexto VARCHAR(100),
    Calorias INT,
    Proteinas FLOAT,
    Carbohidratos FLOAT,
    Grasas FLOAT
);
GO