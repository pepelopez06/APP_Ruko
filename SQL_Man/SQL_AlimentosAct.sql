USE FitProDB;
GO

-- Limpiamos por las dudas si quedó algo previo
DELETE FROM Alimentos;
GO

-- SECCIÓN 1: Golosinas, Alfajores y Chocolates Argentinos
INSERT INTO Alimentos (Nombre, Categoria, Calorias, Proteinas, Carbohidratos, Grasas) VALUES
('Alfajor de maicena con dulce de leche', 'Golosinas', 380, 5.0, 58.0, 15.0),
('Alfajor bañado en chocolate simple (tipo Guaymallén)', 'Golosinas', 420, 6.0, 62.0, 17.0),
('Alfajor triple con dulce de leche y baño de repostería', 'Golosinas', 440, 6.5, 64.0, 18.0),
('Alfajor premium (tipo Cachafaz / Havanna)', 'Golosinas', 430, 7.0, 55.0, 20.0),
('Alfajor de arroz bañado en chocolate negro', 'Golosinas', 390, 4.0, 65.0, 12.0),
('Alfajor de arroz dulce de leche y baño repostero', 'Golosinas', 385, 4.5, 66.0, 11.0),
('Oblita Rodhesia', 'Golosinas', 520, 6.0, 60.0, 28.0),
('Oblita Tita', 'Golosinas', 510, 5.5, 63.0, 26.0),
('Turrón de maní con oblea (Arcor)', 'Golosinas', 460, 13.0, 62.0, 18.0),
('Mantecol (postre de maní)', 'Golosinas', 530, 12.0, 48.0, 32.0),
('Bocadito Bon O Bon', 'Golosinas', 550, 9.0, 48.0, 36.0),
('Caramelos masticables frutales (Sugus / Palitos)', 'Golosinas', 390, 0.0, 95.0, 1.5),
('Caramelos duros ácidos o miel', 'Golosinas', 385, 0.0, 96.0, 0.1),
('Chocolate con leche Cofler', 'Golosinas', 535, 7.5, 56.0, 31.0),
('Chocolate Aguila semi amargo para taza', 'Golosinas', 530, 6.0, 50.0, 34.0),
('Chocolate blanco Marroc / Block', 'Golosinas', 545, 6.5, 54.0, 33.0),
('Bombones surtidos de chocolate', 'Golosinas', 520, 5.0, 57.0, 30.0),
('Pastillas DRF / Mogul', 'Golosinas', 360, 1.0, 88.0, 0.5),
('Chupetines Pico Dulce', 'Golosinas', 390, 0.0, 97.0, 0.0),
('Barrita de cereales con baño de yogur', 'Golosinas', 410, 5.0, 68.0, 12.0),

-- SECCIÓN 2: Helados y Postres Tradicionales
('Helado de Dulce de Leche artesanal', 'Helados', 230, 4.5, 28.0, 11.0),
('Helado de Dulce de Leche granizado', 'Helados', 250, 4.2, 29.0, 13.0),
('Helado de Chocolate artesanal', 'Helados', 245, 5.0, 27.0, 13.0),
('Helado de Chocolate amargo / 70%', 'Helados', 235, 5.5, 25.0, 12.0),
('Helado de Frutilla al agua', 'Helados', 110, 0.5, 27.0, 0.2),
('Helado de Limón al agua', 'Helados', 105, 0.1, 26.0, 0.1),
('Helado de Frutos rojos al agua', 'Helados', 115, 0.4, 28.0, 0.2),
('Helado de Crema Americana', 'Helados', 220, 3.5, 22.0, 13.0),
('Helado de Vainilla', 'Helados', 205, 3.8, 24.0, 11.0),
('Helado de Mascarpone con frutos rojos', 'Helados', 260, 4.0, 26.0, 15.0),
('Postrecito de chocolate (tipo Serenia / Yogurísimo)', 'Lácteos y Huevos', 110, 3.5, 18.0, 2.5),
('Postrecito de vainilla o dulce de leche', 'Lácteos y Huevos', 105, 3.2, 19.0, 2.2),
('Flán casero tradicional con caramelo', 'Postres', 150, 4.5, 24.0, 4.0),
('Flán casero con dulce de leche', 'Postres', 160, 4.0, 25.0, 5.0),
('Queso y dulce (Vigilante: queso fresco y batata/membrillo)', 'Postres', 280, 6.0, 42.0, 10.0),
('Dulce de membrillo industrial', 'Postres', 275, 0.5, 68.0, 0.1),
('Dulce de batata industrial', 'Postres', 275, 0.5, 68.0, 0.1),
('Budín de pan casero con caramelo', 'Postres', 210, 5.0, 34.0, 6.5),
('Arroz con leche casero', 'Postres', 135, 3.5, 22.0, 3.8),
('Ensalada de frutas casera (sin azúcar agregado)', 'Postres', 55, 0.8, 13.5, 0.2);
GO