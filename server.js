const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// Datos en memoria (para pruebas)
let patients = []
let appointments = []
let nextPatientId = 1
let nextAppointmentId = 1

// ============ LOGIN ============
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body
    if (email === 'admin@fisio.com' && password === '1234') {
        res.json({ success: true, message: 'Login exitoso' })
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' })
    }
})

// ============ PACIENTES ============
app.get('/api/patients', (req, res) => {
    res.json(patients)
})

app.post('/api/patients', (req, res) => {
    const newPatient = { id: nextPatientId++, ...req.body }
    patients.push(newPatient)
    res.json(newPatient)
})

app.put('/api/patients/:id', (req, res) => {
    const id = parseInt(req.params.id)
    const index = patients.findIndex(p => p.id === id)
    if (index !== -1) {
        patients[index] = { ...patients[index], ...req.body }
        res.json({ message: 'Actualizado' })
    } else {
        res.status(404).json({ error: 'No encontrado' })
    }
})

app.delete('/api/patients/:id', (req, res) => {
    const id = parseInt(req.params.id)
    patients = patients.filter(p => p.id !== id)
    res.json({ message: 'Eliminado' })
})

// ============ CITAS ============
app.get('/api/appointments', (req, res) => {
    const result = appointments.map(apt => ({
        ...apt,
        patient_name: patients.find(p => p.id === apt.patient_id)?.name || 'Desconocido'
    }))
    res.json(result)
})

app.post('/api/appointments', (req, res) => {
    const newAppointment = {
        id: nextAppointmentId++,
        ...req.body,
        status: req.body.source === 'admin' ? 'confirmada' : 'pendiente'
    }
    appointments.push(newAppointment)
    res.json(newAppointment)
})

app.patch('/api/appointments/:id/confirm', (req, res) => {
    const id = parseInt(req.params.id)
    const apt = appointments.find(a => a.id === id)
    if (apt) {
        apt.status = 'confirmada'
        res.json({ message: 'Confirmada' })
    } else {
        res.status(404).json({ error: 'No encontrada' })
    }
})

app.patch('/api/appointments/:id/cancel', (req, res) => {
    const id = parseInt(req.params.id)
    const apt = appointments.find(a => a.id === id)
    if (apt) {
        apt.status = 'cancelada'
        res.json({ message: 'Cancelada' })
    } else {
        res.status(404).json({ error: 'No encontrada' })
    }
})

app.delete('/api/appointments/:id', (req, res) => {
    const id = parseInt(req.params.id)
    appointments = appointments.filter(a => a.id !== id)
    res.json({ message: 'Eliminada' })
})

// ============ EXPEDIENTES ============
app.get('/api/records/:patientId', (req, res) => {
    res.json({ notes: '', diagnosis: '', treatment: '', files: [] })
})

app.post('/api/records', (req, res) => {
    res.json({ message: 'Guardado' })
})

app.post('/api/records/upload/:patientId', (req, res) => {
    res.json({ message: 'Archivo subido' })
})

app.delete('/api/records/file/:fileId', (req, res) => {
    res.json({ message: 'Eliminado' })
})

// ============ HEALTH ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`)
})
