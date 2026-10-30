USE FitProDB;
CREATE TABLE Progresos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Ejercicio NVARCHAR(100) NOT NULL,
    PesoMaximo INT NOT NULL,
    Fecha DATETIME DEFAULT GETDATE()
);

INSERT INTO Progresos (Ejercicio, PesoMaximo) VALUES ('Sentadilla Libre', 120);
INSERT INTO Progresos (Ejercicio, PesoMaximo) VALUES ('Press de Banca Plano', 85);