const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.cvaijwcgznsciwhczlmx:Adminpepe90__@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

const alimentosBase = [
    { n: 'Pechuga de Pollo', c: 'Carnes', cal: 165, p: 31, car: 0, g: 3.6 },
    { n: 'Muslo de Pollo', c: 'Carnes', cal: 211, p: 26, car: 0, g: 11 },
    { n: 'Carne Vacuna Magra', c: 'Carnes', cal: 250, p: 26, car: 0, g: 15 },
    { n: 'Asado Vacuno', c: 'Carnes', cal: 315, p: 24, car: 0, g: 24 },
    { n: 'Huevo Entero', c: 'Lácteos y Huevos', cal: 155, p: 13, car: 1.1, g: 11 },
    { n: 'Leche Descremada', c: 'Lácteos y Huevos', cal: 35, p: 3.4, car: 5, g: 0.1 },
    { n: 'Arroz Blanco', c: 'Cereales', cal: 130, p: 2.7, car: 28, g: 0.3 },
    { n: 'Avena Tradicional', c: 'Cereales', cal: 389, p: 16.9, car: 66.3, g: 6.9 },
    { n: 'Pan Integral', c: 'Panadería', cal: 247, p: 13, car: 41, g: 3.5 },
    { n: 'Banana', c: 'Frutas', cal: 89, p: 1.1, car: 22.8, g: 0.3 },
    { n: 'Manzana', c: 'Frutas', cal: 52, p: 0.3, car: 13.8, g: 0.2 },
    { n: 'Papa', c: 'Verduras', cal: 87, p: 2, car: 20.1, g: 0.1 },
    { n: 'Alfajor', c: 'Snacks', cal: 440, p: 6, car: 60, g: 19 },
    { n: 'Dulce de Leche', c: 'Snacks', cal: 315, p: 6, car: 55, g: 8 },
    { n: 'Coca-Cola', c: 'Bebidas', cal: 42, p: 0, car: 10.6, g: 0 }
];

async function poblar() {
    try {
        console.log("Subiendo alimentos a Supabase...");
        for (let item of alimentosBase) {
            await pool.query(
                `INSERT INTO Alimentos (Nombre, Categoria, Calorias, Proteinas, Carbohidratos, Grasas) VALUES ($1, $2, $3, $4, $5, $6)`,
                [item.n, item.c, item.cal, item.p, item.car, item.g]
            );
        }
        console.log("¡Alimentos subidos con éxito! 🟢");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

poblar();