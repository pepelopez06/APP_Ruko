const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(express.static(__dirname));

// Conexión a Supabase (Pooler). La cadena va en la variable de entorno DATABASE_URL.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres.cvaijwcgznsciwhczlmx:Adminpepe90__@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error("Error al conectar a Supabase:", err.stack);
    }
    console.log("¡Conexión exitosa a la base de datos de Supabase en la nube! 🟢");
    release();
});

// Un hash de bcrypt siempre empieza con $2a$, $2b$ o $2y$
const isHash = (v) => typeof v === 'string' && /^\$2[aby]\$/.test(v);

const normalizarUsuario = (u) => {
    const id = u.id || u.Id;
    const nombre = u.nombre || u.Nombre;
    const peso = u.peso || u.Peso;
    const altura = u.altura || u.Altura;
    const edad = u.edad || u.Edad;
    const actividad = u.actividad || u.Actividad;
    const objetivo = u.objetivo || u.Objetivo;
    const foto = u.foto || u.Foto || null;
    return {
        id, Id: id,
        nombre, Nombre: nombre,
        peso, Peso: peso,
        altura, Altura: altura,
        edad, Edad: edad,
        actividad, Actividad: actividad,
        objetivo, Objetivo: objetivo,
        foto, Foto: foto
    };
};

// Diagnóstico: abrí /api/health en el navegador para ver si la base responde
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, database: 'conectada', DATABASE_URL_definida: !!process.env.DATABASE_URL });
    } catch (e) {
        res.status(500).json({ ok: false, DATABASE_URL_definida: !!process.env.DATABASE_URL, error: e.message, codigo: e.code || null });
    }
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
        const resultado = await pool.query("SELECT UsuarioId, TO_CHAR(Fecha::date, 'YYYY-MM-DD') AS fecha, Asistio FROM AsistenciaGimnasio WHERE UsuarioId = $1", [usuarioId]);
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
        if (!nombre || !password) {
            return res.status(400).json({ error: 'Completá nombre y contraseña.' });
        }
        const existe = await pool.query('SELECT Id FROM Usuarios WHERE Nombre = $1', [nombre]);

        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Ese nombre ya está en uso.' });
        }

        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO Usuarios (Nombre, Password, Peso, Altura, Edad, Actividad, Objetivo) VALUES ($1, $2, 75, 175, 20, 1.55, $3)',
            [nombre, hash, 'mantenimiento']
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
            'SELECT Id, Nombre, Password, Peso, Altura, Edad, Actividad, Objetivo, Foto FROM Usuarios WHERE Nombre = $1',
            [nombre]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'Nombre o contraseña incorrectos.' });
        }

        const u = resultado.rows[0];
        const stored = u.password || u.Password;
        const userId = u.id || u.Id;
        let ok = false;

        if (isHash(stored)) {
            ok = await bcrypt.compare(password || '', stored);
        } else if (stored === password) {
            // Cuenta antigua con contraseña en texto plano: se migra a hash al iniciar sesión
            ok = true;
            const hash = await bcrypt.hash(password, 10);
            await pool.query('UPDATE Usuarios SET Password = $1 WHERE Id = $2', [hash, userId]);
        }

        if (!ok) {
            return res.status(401).json({ error: 'Nombre o contraseña incorrectos.' });
        }

        res.json({ success: true, usuario: normalizarUsuario(u) });
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

app.get('/api/usuario/:id', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT Id, Nombre, Peso, Altura, Edad, Actividad, Objetivo, Foto FROM Usuarios WHERE Id = $1',
            [req.params.id]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.json({ success: true, usuario: normalizarUsuario(r.rows[0]) });
    } catch (error) {
        console.error("Error al leer el usuario:", error);
        res.status(500).json({ error: "Error al leer el usuario" });
    }
});

app.put('/api/usuario/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { actual, nueva } = req.body;

        if (!nueva || String(nueva).length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        const r = await pool.query('SELECT Password FROM Usuarios WHERE Id = $1', [id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const stored = r.rows[0].password || r.rows[0].Password;
        const ok = isHash(stored) ? await bcrypt.compare(actual || '', stored) : stored === actual;
        if (!ok) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const hash = await bcrypt.hash(nueva, 10);
        await pool.query('UPDATE Usuarios SET Password = $1 WHERE Id = $2', [hash, id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ error: "Error al cambiar la contraseña" });
    }
});

app.put('/api/usuario/:id/foto', async (req, res) => {
    try {
        const { id } = req.params;
        const { foto } = req.body;
        if (typeof foto !== 'string' || !foto.startsWith('data:image/') || foto.length > 500000) {
            return res.status(400).json({ error: 'Imagen inválida o demasiado grande.' });
        }
        await pool.query('UPDATE Usuarios SET Foto = $1 WHERE Id = $2', [foto, id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al guardar foto:", error);
        res.status(500).json({ error: "Error al guardar la foto" });
    }
});

app.get('/api/usuario/:id/config', async (req, res) => {
    try {
        const r = await pool.query('SELECT Config FROM Usuarios WHERE Id = $1', [req.params.id]);
        let cfg = {};
        const raw = r.rows[0] && (r.rows[0].config || r.rows[0].Config);
        if (raw) { try { cfg = JSON.parse(raw); } catch (e) { cfg = {}; } }
        res.json({ config: cfg });
    } catch (error) {
        console.error("Error al leer configuración:", error);
        res.status(500).json({ error: "Error al leer la configuración" });
    }
});

app.put('/api/usuario/:id/config', async (req, res) => {
    try {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ error: 'Configuración inválida.' });
        }
        const texto = JSON.stringify(config);
        if (texto.length > 100000) {
            return res.status(400).json({ error: 'Configuración demasiado grande.' });
        }
        await pool.query('UPDATE Usuarios SET Config = $1 WHERE Id = $2', [texto, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al guardar configuración:", error);
        res.status(500).json({ error: "Error al guardar la configuración" });
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
            "SELECT TO_CHAR(Fecha::date, 'YYYY-MM-DD') AS fecha, PesoMaximo FROM HistorialCargas WHERE UsuarioId = $1 AND Ejercicio = $2 ORDER BY fecha ASC",
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