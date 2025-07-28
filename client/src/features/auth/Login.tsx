import React, { useState } from 'react'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'
import { loginStart, loginSuccess, loginFailure } from './authSlice'

const Login: React.FC = () => {
  const dispatch = useDispatch()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    dispatch(loginStart())
    
    try {
      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock successful login
      dispatch(loginSuccess({
        id: '1',
        email: email,
        name: 'John Doe'
      }))
    } catch (err) {
      dispatch(loginFailure('Invalid email or password'))
    }
  }

  const handleSkipSignIn = async () => {
    dispatch(loginStart())
    
    // Immediate debug login with mock user
    setTimeout(() => {
      dispatch(loginSuccess({
        id: 'debug-user',
        email: 'debug@familynavigator.dev',
        name: 'Debug User'
      }))
    }, 100)
  }

  // Check if we're in development mode
  const isDevelopment = (import.meta as any).env?.DEV ?? process.env.NODE_ENV === 'development'

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Family Navigator
          </Typography>
          <Typography component="h2" variant="h6" align="center" color="text.secondary" gutterBottom>
            Sign In
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            {isDevelopment && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleSkipSignIn}
                  disabled={loading}
                  sx={{
                    color: 'warning.main',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    '&:hover': {
                      color: 'warning.dark',
                    },
                    '&:disabled': {
                      color: 'text.disabled',
                      cursor: 'not-allowed',
                    }
                  }}
                >
                  🚧 Skip Sign-In (Debug Mode)
                </Link>
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Development only - not available in production
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Login