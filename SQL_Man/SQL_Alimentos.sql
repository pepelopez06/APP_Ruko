-- Si ya la tenías creada, puedes eliminarla para recrearla con la categoría incluida
DROP TABLE IF EXISTS Alimentos;

CREATE TABLE Alimentos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(150) NOT NULL,
    Categoria NVARCHAR(100) NOT NULL,
    Calorias INT NOT NULL,
    Proteinas DECIMAL(5,2) NOT NULL,
    Carbohidratos DECIMAL(5,2) NOT NULL,
    Grasas DECIMAL(5,2) NOT NULL
);