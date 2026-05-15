const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ============ CONFIGURACIÓN DE SUPABASE ============
const SUPABASE_URL = 'https://afxcmjwarttzuzvfhhtd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IOWYdr0tifgLAyHcAQmbUg_QPiW1222';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración de multer para archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes, PDFs y documentos'));
        }
    }
});

// ============ LOGIN ============
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@fisio.com' && password === '1234') {
        res.json({ success: true, message: 'Login exitoso' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
});

// ============ PACIENTES ============
app.get('/api/patients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { name, age, phone, issue } = req.body;
        const { data, error } = await supabase
            .from('patients')
            .insert([{ name, age, phone, issue }])
            .select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, phone, issue } = req.body;
        const { error } = await supabase
            .from('patients')
            .update({ name, age, phone, issue })
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Actualizado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ CITAS ============
app.get('/api/appointments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*, patients(name, phone)')
            .order('date', { ascending: true });
        if (error) throw error;
        const result = (data || []).map(apt => ({
            ...apt,
            patient_name: apt.patients?.name || 'Desconocido',
            patient_phone: apt.patients?.phone
        }));
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { patient_id, date, time, motive, source } = req.body;
        const status = source === 'admin' ? 'confirmada' : 'pendiente';
        const citaSource = source === 'admin' ? 'admin' : 'web';
        const { data, error } = await supabase
            .from('appointments')
            .insert([{ patient_id, date, time, motive, status, source: citaSource }])
            .select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/appointments/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'confirmada' })
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Confirmada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/appointments/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelada' })
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Cancelada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Eliminada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ EXPEDIENTES ============
app.get('/api/records/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { data, error } = await supabase
            .from('medical_records')
            .select('*')
            .eq('patient_id', patientId)
            .order('updated_at', { ascending: false })
            .limit(1);
        if (error) throw error;
        
        const { data: files, error: filesError } = await supabase
            .storage
            .from('patient-files')
            .list(patientId);
        
        if (filesError && !filesError.message.includes('not found')) throw filesError;
        
        const formattedFiles = (files || []).map(file => ({
            id: file.id,
            original_name: file.name,
            filename: file.name,
            uploaded_at: file.created_at,
            file_type: file.metadata?.mimetype || 'application/octet-stream'
        }));
        
        res.json({ 
            notes: data?.[0]?.notes || '',
            diagnosis: data?.[0]?.diagnosis || '',
            treatment: data?.[0]?.treatment || '',
            files: formattedFiles
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/records', async (req, res) => {
    try {
        const { patient_id, notes, diagnosis, treatment } = req.body;
        const { error } = await supabase
            .from('medical_records')
            .upsert({ patient_id, notes, diagnosis, treatment, updated_at: new Date() });
        if (error) throw error;
        res.json({ message: 'Guardado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/records/upload/:patientId', upload.single('file'), async (req, res) => {
    try {
        const { patientId } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }
        
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${patientId}/${timestamp}-${safeName}`;
        
        const { data, error } = await supabase
            .storage
            .from('patient-files')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });
        
        if (error) throw error;
        
        const { data: urlData } = supabase
            .storage
            .from('patient-files')
            .getPublicUrl(filePath);
        
        res.json({ 
            message: 'Archivo subido correctamente',
            file: {
                name: file.originalname,
                path: filePath,
                url: urlData.publicUrl
            }
        });
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/records/file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        res.json({ message: 'Eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando con Supabase' });
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🗄️ Conectado a Supabase`);
});
