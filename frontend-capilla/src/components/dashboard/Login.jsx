import { useState } from 'react';
import {
    Typography,
    Box,
    Paper,
    TextField,
    Button,
} from '@mui/material';

export function LoginForm({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const res = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error || 'Credenciales incorrectas');
            // Guardar token y usuario
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authUser', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        }
    }

    return (
        <Paper elevation={3} sx={{ p: 4, width: 380 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Iniciar sesión</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Email" variant="outlined" value={email} onChange={e => setEmail(e.target.value)} required />
                <TextField label="Contraseña" variant="outlined" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" variant="contained" color="primary">Entrar</Button>
            </Box>
        </Paper>
    );
}