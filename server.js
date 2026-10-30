const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de conexión a Supabase (Pooler)
const pool = new Pool({
    connectionString: "postgresql://postgres.cvaijwcgznsciwhczlmx:Adminpepe90__@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        return console.error("Error al conectar a Supabase:", err.stack);
    }
    console.log("¡Conexión exitosa a la base de datos de Supabase en la nube! 🟢");
    release();
});

// Ruta para buscar alimentos
app.get('/api/alimentos', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const queryStr = 'SELECT * FROM Alimentos WHERE Nombre ILIKE $1 ORDER BY Nombre ASC LIMIT 50';
        const resultado = await pool.query(queryStr, [`%${busqueda}%`]);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al buscar alimentos" });
    }
});

// ==========================================
// RUTINAS Y ASISTENCIA
// ==========================================

app.get('/api/rutinas', async (req, res) => {
    try {
        const { usuarioId } = req.query;
        if (!usuarioId || usuarioId === 'undefined') {
            return res.json([]);
        }
        const resultado = await pool.query('SELECT * FROM RutinasEntrenamiento WHERE UsuarioId = $1', [usuarioId]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("DETALLE DE ERROR EN /api/rutinas:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rutinas', async (req, res) => {
    try {
        const { usuarioId, diaSemana, ejercicio, setsJson } = req.body;
        await pool.query(
            'INSERT INTO RutinasEntrenamiento (UsuarioId, DiaSemana, NombreEjercicio, SetsJson) VALUES ($1, $2, $3, $4)',
            [usuarioId, diaSemana, ejercicio, setsJson]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar el ejercicio" });
    }
});

app.put('/api/rutinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { setsJson } = req.body;
        await pool.query('UPDATE RutinasEntrenamiento SET SetsJson = $1 WHERE Id = $2', [setsJson, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el ejercicio" });
    }
});

app.delete('/api/rutinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM RutinasEntrenamiento WHERE Id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el ejercicio" });
    }
});

app.get('/api/asistencia', async (req, res) => {
    try {
        const { usuarioId } = req.query;
        if (!usuarioId || usuarioId === 'undefined') {
            return res.json([]);
        }
        const resultado = await pool.query('SELECT * FROM AsistenciaGimnasio WHERE UsuarioId = $1', [usuarioId]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("DETALLE DE ERROR EN /api/asistencia:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/asistencia', async (req, res) => {
    try {
        const { usuarioId, fecha, asistio } = req.body;
        if (asistio) {
            await pool.query(`
                INSERT INTO AsistenciaGimnasio (UsuarioId, Fecha, Asistio) 
                VALUES ($1, $2, TRUE)
                ON CONFLICT (UsuarioId, Fecha) DO UPDATE SET Asistio = TRUE
            `, [usuarioId, fecha]);
        } else {
            await pool.query('DELETE FROM AsistenciaGimnasio WHERE UsuarioId = $1 AND Fecha = $2', [usuarioId, fecha]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar la asistencia" });
    }
});

// ==========================================
// AUTENTICACIÓN Y PERFIL
// ==========================================

app.post('/api/register', async (req, res) => {
    try {
        const { nombre, password } = req.body;
        const existe = await pool.query('SELECT * FROM Usuarios WHERE Nombre = $1', [nombre]);

        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Ese nombre ya está en uso.' });
        }

        await pool.query(
            'INSERT INTO Usuarios (Nombre, Password, Peso, Altura, Edad, Actividad, Objetivo) VALUES ($1, $2, 75, 175, 20, 1.55, $3)',
            [nombre, password, 'mantenimiento']
        );

        res.json({ success: true, message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { nombre, password } = req.body;
        const resultado = await pool.query(
            'SELECT Id, Nombre, Peso, Altura, Edad, Actividad, Objetivo FROM Usuarios WHERE Nombre = $1 AND Password = $2',
            [nombre, password]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'Nombre o contraseña incorrectos.' });
        }

        const u = resultado.rows[0];
        const usuarioNormalizado = {
            id: u.id || u.Id,
            Id: u.id || u.Id,
            nombre: u.nombre || u.Nombre,
            Nombre: u.nombre || u.Nombre,
            peso: u.peso || u.Peso,
            Peso: u.peso || u.Peso,
            altura: u.altura || u.Altura,
            Altura: u.altura || u.Altura,
            edad: u.edad || u.Edad,
            Edad: u.edad || u.Edad,
            actividad: u.actividad || u.Actividad,
            Actividad: u.actividad || u.Actividad,
            objetivo: u.objetivo || u.Objetivo,
            Objetivo: u.objetivo || u.Objetivo
        };

        res.json({ success: true, usuario: usuarioNormalizado });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { peso, altura, edad, actividad, objetivo } = req.body;
        await pool.query(
            'UPDATE Usuarios SET Peso = $1, Altura = $2, Edad = $3, Actividad = $4, Objetivo = $5 WHERE Id = $6',
            [peso, altura, edad, actividad, objetivo, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el perfil del usuario" });
    }
});

// ==========================================
// CONSUMO NUTRICIONAL
// ==========================================

app.get('/api/consumo', async (req, res) => {
    try {
        const { usuarioId, fecha } = req.query;
        if (!usuarioId || usuarioId === 'undefined') {
            return res.json([]);
        }
        const resultado = await pool.query('SELECT * FROM ConsumoNutricional WHERE UsuarioId = $1 AND Fecha = $2', [usuarioId, fecha]);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el consumo nutricional" });
    }
});

app.post('/api/consumo', async (req, res) => {
    try {
        const { usuarioId, fecha, nombre, medidaTexto, calorias, proteinas, carbohidratos, grasas } = req.body;
        await pool.query(
            'INSERT INTO ConsumoNutricional (UsuarioId, Fecha, Nombre, MedidaTexto, Calorias, Proteinas, Carbohidratos, Grasas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [usuarioId, fecha, nombre, medidaTexto, calorias, proteinas, carbohidratos, grasas]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar el alimento consumido" });
    }
});

app.delete('/api/consumo/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM ConsumoNutricional WHERE Id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el alimento consumido" });
    }
});

// ==========================================
// HISTORIAL DE CARGAS
// ==========================================

app.get('/api/historial-cargas', async (req, res) => {
    try {
        const { usuarioId, ejercicio } = req.query;
        if (!usuarioId || usuarioId === 'undefined') {
            return res.json([]);
        }
        const resultado = await pool.query(
            'SELECT Fecha, PesoMaximo FROM HistorialCargas WHERE UsuarioId = $1 AND Ejercicio = $2 ORDER BY Fecha ASC',
            [usuarioId, ejercicio]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el historial de cargas" });
    }
});

app.post('/api/historial-cargas', async (req, res) => {
    try {
        const { usuarioId, fecha, ejercicio, pesoMaximo } = req.body;
        await pool.query(`
            INSERT INTO HistorialCargas (UsuarioId, Fecha, Ejercicio, PesoMaximo) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (UsuarioId, Fecha, Ejercicio) DO UPDATE SET PesoMaximo = $4
        `, [usuarioId, fecha, ejercicio, pesoMaximo]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar el historial de cargas" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`¡El motor de la app está encendido en el puerto ${PORT}! 🚀`);
});