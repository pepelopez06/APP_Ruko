const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // Render atiende detrás de un proxy
app.use(express.json({ limit: '1mb' }));

// Solo se publica la carpeta public. El resto del proyecto (server.js, SQL) no se sirve.
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a Supabase (Pooler). La cadena va en la variable de entorno DATABASE_URL.
if (!process.env.DATABASE_URL) {
    console.error("Falta la variable de entorno DATABASE_URL");
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error("Error al conectar a Supabase:", err.stack);
    }
    console.log("¡Conexión exitosa a la base de datos de Supabase en la nube! 🟢");
    release();
    asegurarEsquema().catch(e => console.error("Error al actualizar el esquema:", e.message));
});

// Cambios que solo agregan columnas o tablas; se pueden ejecutar más de una vez sin riesgo.
async function asegurarEsquema() {
    await pool.query('ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS Sexo VARCHAR(10)');
    await pool.query('ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS Email VARCHAR(254)');
    await pool.query(`CREATE TABLE IF NOT EXISTS Interesados (
        Id SERIAL PRIMARY KEY,
        Email VARCHAR(254) UNIQUE NOT NULL,
        Fuente VARCHAR(50),
        CreadoEn TIMESTAMPTZ DEFAULT NOW()
    )`);
}

// ==========================================
// SESIONES: cada pedido se identifica con un token firmado por el servidor
// ==========================================

if (!process.env.SESSION_SECRET) {
    console.warn("Falta SESSION_SECRET: se usa una clave temporal y las sesiones se cerrarán en cada reinicio.");
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESION_MS = 30 * 24 * 60 * 60 * 1000;

const firmar = (datos) => crypto.createHmac('sha256', SESSION_SECRET).update(datos).digest('base64url');

const crearToken = (uid) => {
    const datos = Buffer.from(JSON.stringify({ uid, exp: Date.now() + SESION_MS })).toString('base64url');
    return `${datos}.${firmar(datos)}`;
};

const leerToken = (token) => {
    const [datos, firma] = String(token || '').split('.');
    if (!datos || !firma) return null;
    const esperada = Buffer.from(firmar(datos));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
    try {
        const { uid, exp } = JSON.parse(Buffer.from(datos, 'base64url').toString());
        return Number.isInteger(uid) && exp > Date.now() ? uid : null;
    } catch (e) {
        return null;
    }
};

const RUTAS_PUBLICAS = new Set(['/health', '/login', '/register', '/interesados']);

app.use('/api', (req, res, next) => {
    if (RUTAS_PUBLICAS.has(req.path)) return next();
    const uid = leerToken((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!uid) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });
    req.uid = uid;
    // Nadie puede pedir ni modificar datos de otra cuenta
    const pedido = (req.query && req.query.usuarioId) || (req.body && req.body.usuarioId);
    if (pedido !== undefined && Number(pedido) !== uid) {
        return res.status(403).json({ error: 'No autorizado.' });
    }
    next();
});

app.use('/api/usuario/:id', (req, res, next) => {
    if (Number(req.params.id) !== req.uid) return res.status(403).json({ error: 'No autorizado.' });
    next();
});

// Límite de intentos en memoria para frenar pruebas masivas de contraseñas
const intentos = new Map();
const superaLimite = (clave, maximo, ventanaMs) => {
    const ahora = Date.now();
    const previo = intentos.get(clave);
    const actual = previo && previo.vence > ahora ? previo : { n: 0, vence: ahora + ventanaMs };
    actual.n += 1;
    intentos.set(clave, actual);
    if (intentos.size > 10000) {
        for (const [k, v] of intentos) if (v.vence <= ahora) intentos.delete(k);
    }
    return actual.n > maximo;
};
const QUINCE_MIN = 15 * 60 * 1000;
const UNA_HORA = 60 * 60 * 1000;

const emailValido = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Un hash de bcrypt siempre empieza con $2a$, $2b$ o $2y$
const isHash = (v) => typeof v === 'string' && /^\$2[aby]\$/.test(v);

// Plan efectivo: 'pro' solo si plan = pro y (sin vencimiento o vencimiento no pasado)
const PLAN_SQL = "CASE WHEN plan = 'pro' AND (plan_vence IS NULL OR plan_vence >= CURRENT_DATE) THEN 'pro' ELSE 'free' END AS plan_efectivo, TO_CHAR(plan_vence, 'YYYY-MM-DD') AS plan_vence_txt";

const normalizarUsuario = (u) => {
    const plan = u.plan_efectivo || 'free';
    const planVence = u.plan_vence_txt || null;
    const id = u.id || u.Id;
    const nombre = u.nombre || u.Nombre;
    const peso = u.peso || u.Peso;
    const altura = u.altura || u.Altura;
    const edad = u.edad || u.Edad;
    const actividad = u.actividad || u.Actividad;
    const objetivo = u.objetivo || u.Objetivo;
    const foto = u.foto || u.Foto || null;
    const sexo = u.sexo || u.Sexo || null;
    return {
        sexo, Sexo: sexo,
        id, Id: id,
        nombre, Nombre: nombre,
        peso, Peso: peso,
        altura, Altura: altura,
        edad, Edad: edad,
        actividad, Actividad: actividad,
        objetivo, Objetivo: objetivo,
        foto, Foto: foto,
        plan, Plan: plan,
        planVence, PlanVence: planVence
    };
};

// Diagnóstico: abrí /api/health en el navegador para ver si la base responde
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true });
    } catch (e) {
        console.error("Error en /api/health:", e.message);
        res.status(500).json({ ok: false });
    }
});

// Formulario de la página de presentación, que vive en otro dominio.
// LANDING_ORIGIN admite varios dominios separados por coma.
const origenesLanding = (process.env.LANDING_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const corsLanding = cors({ origin: origenesLanding, methods: ['POST'] });
app.options('/api/interesados', corsLanding);
app.post('/api/interesados', corsLanding, async (req, res) => {
    try {
        if (superaLimite(`interesados:${req.ip}`, 10, UNA_HORA)) {
            return res.status(429).json({ error: 'Demasiados intentos. Probá más tarde.' });
        }
        const email = String((req.body && req.body.email) || '').trim().toLowerCase();
        if (!emailValido(email)) return res.status(400).json({ error: 'Revisá el email.' });
        await pool.query(
            'INSERT INTO Interesados (Email, Fuente) VALUES ($1, $2) ON CONFLICT (Email) DO NOTHING',
            [email, String((req.body && req.body.fuente) || 'landing').slice(0, 50)]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error al guardar interesado:", error.message);
        res.status(500).json({ error: 'No se pudo guardar. Probá de nuevo.' });
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
        const resultado = await pool.query('SELECT * FROM RutinasEntrenamiento WHERE UsuarioId = $1', [req.uid]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("DETALLE DE ERROR EN /api/rutinas:", error);
        res.status(500).json({ error: "Error al obtener las rutinas" });
    }
});

app.post('/api/rutinas', async (req, res) => {
    try {
        const { diaSemana, ejercicio, setsJson } = req.body;
        await pool.query(
            'INSERT INTO RutinasEntrenamiento (UsuarioId, DiaSemana, NombreEjercicio, SetsJson) VALUES ($1, $2, $3, $4)',
            [req.uid, diaSemana, ejercicio, setsJson]
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
        await pool.query('UPDATE RutinasEntrenamiento SET SetsJson = $1 WHERE Id = $2 AND UsuarioId = $3', [setsJson, id, req.uid]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el ejercicio" });
    }
});

app.delete('/api/rutinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM RutinasEntrenamiento WHERE Id = $1 AND UsuarioId = $2', [id, req.uid]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el ejercicio" });
    }
});

app.get('/api/asistencia', async (req, res) => {
    try {
        const resultado = await pool.query("SELECT UsuarioId, TO_CHAR(Fecha::date, 'YYYY-MM-DD') AS fecha, Asistio FROM AsistenciaGimnasio WHERE UsuarioId = $1", [req.uid]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("DETALLE DE ERROR EN /api/asistencia:", error);
        res.status(500).json({ error: "Error al obtener la asistencia" });
    }
});

app.post('/api/asistencia', async (req, res) => {
    try {
        const { fecha, asistio } = req.body;
        if (asistio) {
            await pool.query(`
                INSERT INTO AsistenciaGimnasio (UsuarioId, Fecha, Asistio)
                VALUES ($1, $2, TRUE)
                ON CONFLICT (UsuarioId, Fecha) DO UPDATE SET Asistio = TRUE
            `, [req.uid, fecha]);
        } else {
            await pool.query('DELETE FROM AsistenciaGimnasio WHERE UsuarioId = $1 AND Fecha = $2', [req.uid, fecha]);
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
        const { nombre, password, email } = req.body;
        if (superaLimite(`registro:${req.ip}`, 20, UNA_HORA)) {
            return res.status(429).json({ error: 'Demasiados intentos. Probá más tarde.' });
        }
        if (!nombre || !password) {
            return res.status(400).json({ error: 'Completá nombre y contraseña.' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }
        const emailLimpio = String(email || '').trim().toLowerCase();
        if (emailLimpio && !emailValido(emailLimpio)) {
            return res.status(400).json({ error: 'Revisá el email.' });
        }
        const existe = await pool.query('SELECT Id FROM Usuarios WHERE Nombre = $1', [nombre]);

        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Ese nombre ya está en uso.' });
        }

        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO Usuarios (Nombre, Password, Peso, Altura, Edad, Actividad, Objetivo, Email) VALUES ($1, $2, 75, 175, 20, 1.55, $3, $4)',
            [nombre, hash, 'mantenimiento', emailLimpio || null]
        );

        res.json({ success: true, message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ error: 'No se pudo crear la cuenta. Probá de nuevo.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { nombre, password } = req.body;
        const claveIntentos = `login:${req.ip}:${String(nombre).toLowerCase()}`;
        if (superaLimite(claveIntentos, 10, QUINCE_MIN)) {
            return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos.' });
        }
        const resultado = await pool.query(
            'SELECT Id, Nombre, Password, Peso, Altura, Edad, Actividad, Objetivo, Foto, Sexo, ' + PLAN_SQL + ' FROM Usuarios WHERE Nombre = $1',
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

        intentos.delete(claveIntentos);
        res.json({ success: true, usuario: normalizarUsuario(u), token: crearToken(userId) });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: 'No se pudo iniciar sesión. Probá de nuevo.' });
    }
});

app.put('/api/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { peso, altura, edad, actividad, objetivo, sexo } = req.body;
        if (sexo !== undefined && sexo !== null && !['masculino', 'femenino'].includes(sexo)) {
            return res.status(400).json({ error: 'Valor de sexo inválido.' });
        }
        await pool.query(
            'UPDATE Usuarios SET Peso = $1, Altura = $2, Edad = $3, Actividad = $4, Objetivo = $5, Sexo = COALESCE($6, Sexo) WHERE Id = $7',
            [peso, altura, edad, actividad, objetivo, sexo || null, id]
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
            'SELECT Id, Nombre, Peso, Altura, Edad, Actividad, Objetivo, Foto, Sexo, ' + PLAN_SQL + ' FROM Usuarios WHERE Id = $1',
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
        const { fecha } = req.query;
        const resultado = await pool.query('SELECT * FROM ConsumoNutricional WHERE UsuarioId = $1 AND Fecha = $2', [req.uid, fecha]);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el consumo nutricional" });
    }
});

app.post('/api/consumo', async (req, res) => {
    try {
        const { fecha, nombre, medidaTexto, calorias, proteinas, carbohidratos, grasas } = req.body;
        await pool.query(
            'INSERT INTO ConsumoNutricional (UsuarioId, Fecha, Nombre, MedidaTexto, Calorias, Proteinas, Carbohidratos, Grasas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [req.uid, fecha, nombre, medidaTexto, calorias, proteinas, carbohidratos, grasas]
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
        await pool.query('DELETE FROM ConsumoNutricional WHERE Id = $1 AND UsuarioId = $2', [id, req.uid]);
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
        const { ejercicio } = req.query;
        const resultado = await pool.query(
            "SELECT TO_CHAR(Fecha::date, 'YYYY-MM-DD') AS fecha, PesoMaximo FROM HistorialCargas WHERE UsuarioId = $1 AND Ejercicio = $2 ORDER BY fecha ASC",
            [req.uid, ejercicio]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el historial de cargas" });
    }
});

app.post('/api/historial-cargas', async (req, res) => {
    try {
        const { fecha, ejercicio, pesoMaximo } = req.body;
        await pool.query(`
            INSERT INTO HistorialCargas (UsuarioId, Fecha, Ejercicio, PesoMaximo) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (UsuarioId, Fecha, Ejercicio) DO UPDATE SET PesoMaximo = $4
        `, [req.uid, fecha, ejercicio, pesoMaximo]);
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