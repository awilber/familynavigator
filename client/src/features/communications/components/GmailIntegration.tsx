import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import {
  Google as GoogleIcon,
  Sync as SyncIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material'

interface GmailStatus {
  isAuthenticated: boolean
  profile?: {
    emailAddress: string
    messagesTotal: number
    threadsTotal: number
  }
}

interface SyncError {
  timestamp: string
  messageId?: string
  operation: string
  error: string
  stackTrace?: string
  apiResponse?: any
  retryCount: number
  isCritical: boolean
}

interface ApiResponse {
  timestamp: string
  endpoint: string
  method: string
  statusCode: number
  response: any
  responseTime: number
}

interface SyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  totalMessages: number
  processedMessages: number
  currentBatch: number
  totalBatches: number
  startTime?: string
  endTime?: string
  error?: string
  detailedErrors: SyncError[]
  currentOperation: string
  operationDetails: string
  messagesPerSecond: number
  estimatedTimeRemaining?: number
  rawApiResponses: ApiResponse[]
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  rateLimitStatus?: {
    remaining: number
    resetTime: string
    dailyQuotaUsed: number
  }
}

interface SyncOptions {
  batchSize: number
  maxMessages?: number
  query: string
  startDate?: string
  endDate?: string
}

const GmailIntegration: React.FC = () => {
  const [status, setStatus] = useState<GmailStatus>({ isAuthenticated: false })
  const [progress, setProgress] = useState<SyncProgress>({
    status: 'idle',
    totalMessages: 0,
    processedMessages: 0,
    currentBatch: 0,
    totalBatches: 0,
    detailedErrors: [],
    currentOperation: 'Idle',
    operationDetails: 'Service ready to start sync',
    messagesPerSecond: 0,
    rawApiResponses: [],
    connectionStatus: 'disconnected'
  })
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showVerboseLogging, setShowVerboseLogging] = useState(true)
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    batchSize: 100,
    maxMessages: undefined,
    query: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    loadGmailStatus()
    loadSyncProgress()
    
    // Poll for progress updates during sync
    const interval = setInterval(() => {
      if (progress.status === 'running') {
        loadSyncProgress()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [progress.status])

  useEffect(() => {
    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search)
    const authResult = urlParams.get('gmail_auth')
    
    if (authResult === 'success') {
      loadGmailStatus()
      // Remove from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (authResult === 'error') {
      console.error('Gmail authentication failed')
      // Remove from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadGmailStatus = async () => {
    try {
      const response = await fetch('/api/gmail/status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Error loading Gmail status:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSyncProgress = async () => {
    try {
      const response = await fetch('/api/gmail/sync/progress')
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error loading sync progress:', error)
    }
  }

  const handleAuthenticate = async () => {
    try {
      const response = await fetch('/api/gmail/auth')
      const data = await response.json()
      
      if (data.success) {
        // Open OAuth URL in the same window
        window.location.href = data.data.authUrl
      }
    } catch (error) {
      console.error('Error starting Gmail authentication:', error)
    }
  }

  const handleRevoke = async () => {
    try {
      const response = await fetch('/api/gmail/revoke', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setStatus({ isAuthenticated: false })
        setProgress({
          status: 'idle',
          totalMessages: 0,
          processedMessages: 0,
          currentBatch: 0,
          totalBatches: 0,
          detailedErrors: [],
          currentOperation: 'Disconnected',
          operationDetails: 'Gmail account disconnected. Ready to reconnect with proper permissions.',
          messagesPerSecond: 0,
          rawApiResponses: [],
          connectionStatus: 'disconnected'
        })
        
        // Show success message briefly
        console.log('Gmail account disconnected successfully. You can now reconnect for fresh permissions.')
      }
    } catch (error) {
      console.error('Error revoking Gmail authentication:', error)
    }
  }

  const handleStartSync = async () => {
    try {
      const options = {
        ...syncOptions,
        maxMessages: syncOptions.maxMessages || undefined
      }

      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
        setSettingsOpen(false)
      }
    } catch (error) {
      console.error('Error starting Gmail sync:', error)
    }
  }

  const handlePauseSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync/pause', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error pausing Gmail sync:', error)
    }
  }

  const handleResumeSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: syncOptions.batchSize })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error resuming Gmail sync:', error)
    }
  }

  const handleStopSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync/stop', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error stopping Gmail sync:', error)
    }
  }

  const handleIncrementalSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync/incremental', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        // Will start in background, progress will be updated via polling
      }
    } catch (error) {
      console.error('Error starting incremental sync:', error)
    }
  }

  const handleTestSync = async () => {
    try {
      const options = {
        batchSize: 10,
        maxMessages: 10,
        query: syncOptions.query || ''
      }

      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setProgress(data.data)
      } else {
        // Display detailed error information
        const errorInfo = {
          timestamp: new Date().toISOString(),
          messageId: undefined,
          operation: 'Test Sync Start',
          error: data.error || 'Unknown error occurred',
          stackTrace: data.details?.stackTrace,
          apiResponse: data.details,
          retryCount: 0,
          isCritical: true
        }
        
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: data.error,
          detailedErrors: [...prev.detailedErrors, errorInfo],
          currentOperation: 'Test Sync Failed',
          operationDetails: `Error: ${data.error}`,
          connectionStatus: 'disconnected'
        }))
      }
    } catch (error: any) {
      console.error('Error starting test sync:', error)
      
      const errorInfo = {
        timestamp: new Date().toISOString(),
        messageId: undefined,
        operation: 'Test Sync Network Error',
        error: error.message || 'Network error occurred',
        stackTrace: error.stack,
        apiResponse: undefined,
        retryCount: 0,
        isCritical: true
      }
      
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: 'Network error during test sync',
        detailedErrors: [...prev.detailedErrors, errorInfo],
        currentOperation: 'Network Error',
        operationDetails: `Failed to connect to server: ${error.message}`,
        connectionStatus: 'disconnected'
      }))
    }
  }

  const handleClearErrors = () => {
    setProgress(prev => ({
      ...prev,
      detailedErrors: [],
      rawApiResponses: []
    }))
  }

  const getProgressPercentage = (): number => {
    if (progress.totalMessages === 0) return 0
    return Math.round((progress.processedMessages / progress.totalMessages) * 100)
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />
      case 'error':
        return <ErrorIcon color="error" />
      case 'running':
        return <SyncIcon color="primary" className="animate-spin" />
      case 'paused':
        return <PauseIcon color="warning" />
      default:
        return <InfoIcon color="action" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'running':
        return 'primary'
      case 'paused':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading Gmail integration...</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <GoogleIcon sx={{ fontSize: 32, color: '#EA4335' }} />
        <Typography variant="h5" fontWeight="bold">
          Gmail Integration
        </Typography>
        {status.isAuthenticated && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Connected"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {!status.isAuthenticated ? (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Connect your Gmail account to import and analyze your email communications.
            This will allow you to search through years of email history and identify patterns.
          </Alert>
          
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={handleAuthenticate}
            size="large"
            sx={{
              backgroundColor: '#EA4335',
              '&:hover': { backgroundColor: '#d33b2a' }
            }}
          >
            Connect Gmail Account
          </Button>
        </Box>
      ) : (
        <Box>
          {/* Account Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connected Account
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1">
                    {status.profile?.emailAddress}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Messages
                  </Typography>
                  <Typography variant="body1">
                    {status.profile?.messagesTotal?.toLocaleString() || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Threads
                  </Typography>
                  <Typography variant="body1">
                    {status.profile?.threadsTotal?.toLocaleString() || 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon()}
                <Typography variant="h6">
                  Sync Status
                </Typography>
                <Chip
                  label={progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                  color={getStatusColor() as any}
                  size="small"
                />
              </Box>

              {progress.status === 'running' && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Processing batch {progress.currentBatch} of {progress.totalBatches}
                    </Typography>
                    <Typography variant="body2">
                      {getProgressPercentage()}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={getProgressPercentage()} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {progress.processedMessages.toLocaleString()} of {progress.totalMessages.toLocaleString()} messages processed
                  </Typography>
                </Box>
              )}

              {progress.status === 'error' && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 2 }}
                  action={
                    progress.error?.includes('authentication required') ||
                    progress.error?.includes('re-authenticate') ? (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleRevoke}
                        sx={{ ml: 1 }}
                      >
                        Disconnect & Reconnect
                      </Button>
                    ) : null
                  }
                >
                  <Typography variant="body2" component="div">
                    <strong>Sync Error:</strong> {progress.error}
                  </Typography>
                  {(progress.error?.includes('authentication required') ||
                    progress.error?.includes('re-authenticate')) && (
                    <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                      This usually indicates a permission scope issue. Please disconnect and reconnect your Gmail account to get the proper permissions.
                    </Typography>
                  )}
                </Alert>
              )}

              {progress.status === 'completed' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Sync completed successfully! Processed {progress.processedMessages.toLocaleString()} messages.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Detailed Progress Information */}
          {(progress.status === 'running' || progress.status === 'paused' || progress.detailedErrors.length > 0) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Detailed Progress Information
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setShowVerboseLogging(!showVerboseLogging)}
                      variant={showVerboseLogging ? 'contained' : 'outlined'}
                    >
                      {showVerboseLogging ? 'Hide' : 'Show'} Verbose Logs
                    </Button>
                    {(progress.detailedErrors.length > 0 || progress.rawApiResponses.length > 0) && (
                      <Button
                        size="small"
                        onClick={handleClearErrors}
                        variant="outlined"
                        color="error"
                      >
                        Clear Logs
                      </Button>
                    )}
                  </Box>
                </Box>
                
                {/* Current Operation */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">
                    Current Operation: {progress.currentOperation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progress.operationDetails}
                  </Typography>
                </Box>

                {/* Performance Metrics */}
                {progress.status === 'running' && progress.messagesPerSecond > 0 && (
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Messages/Second
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {progress.messagesPerSecond}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Connection Status
                      </Typography>
                      <Chip 
                        label={progress.connectionStatus} 
                        color={progress.connectionStatus === 'connected' ? 'success' : 'error'}
                        size="small"
                      />
                    </Grid>
                    {progress.estimatedTimeRemaining && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Est. Time Remaining
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {Math.floor(progress.estimatedTimeRemaining / 60)}m {progress.estimatedTimeRemaining % 60}s
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}

                {/* Error Details */}
                {showVerboseLogging && progress.detailedErrors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Errors ({progress.detailedErrors.length})
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      {progress.detailedErrors.slice(-5).map((error, index) => (
                        <Box key={index} sx={{ mb: 1, p: 1, backgroundColor: error.isCritical ? 'error.light' : 'grey.100', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(error.timestamp).toLocaleTimeString()} - {error.operation}
                            {error.messageId && ` (Message: ${error.messageId})`}
                          </Typography>
                          <Typography variant="body2" color={error.isCritical ? 'error.main' : 'text.primary'}>
                            {error.error}
                          </Typography>
                          {error.apiResponse && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                              API Response: {JSON.stringify(error.apiResponse, null, 2)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* API Call Log */}
                {showVerboseLogging && progress.rawApiResponses.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Recent API Calls ({progress.rawApiResponses.length})
                    </Typography>
                    <Box sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      {progress.rawApiResponses.slice(-10).map((api, index) => (
                        <Box key={index} sx={{ mb: 0.5, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          <Typography variant="caption" color={api.statusCode >= 400 ? 'error.main' : 'success.main'}>
                            {new Date(api.timestamp).toLocaleTimeString()} - {api.method} {api.endpoint} - {api.statusCode} ({api.responseTime}ms)
                          </Typography>
                          {api.statusCode >= 400 && api.response !== 'Success' && (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', ml: 2 }}>
                              {JSON.stringify(api.response)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Filters */}
          <Card sx={{ mb: 3, backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Email Filter
              </Typography>
              <TextField
                fullWidth
                label="Filter Messages"
                value={syncOptions.query}
                onChange={(e) => setSyncOptions({
                  ...syncOptions,
                  query: e.target.value
                })}
                placeholder="e.g., from:person@example.com OR to:person@example.com"
                helperText="Gmail search syntax: from:email@domain.com, to:email@domain.com, (from:email1 OR to:email2)"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                <strong>Examples:</strong><br/>
                • <code>from:john@example.com</code> - Messages from John<br/>
                • <code>to:mary@example.com</code> - Messages to Mary<br/>
                • <code>(from:john@example.com OR to:john@example.com)</code> - Any messages involving John<br/>
                • <code>from:john@example.com OR from:mary@example.com</code> - Messages from John or Mary
              </Typography>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {progress.status === 'idle' || progress.status === 'completed' || progress.status === 'error' ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={() => setSettingsOpen(true)}
                  color="primary"
                >
                  Start Full Sync
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleTestSync}
                  color="secondary"
                >
                  Test Sync (10 messages)
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleIncrementalSync}
                >
                  Incremental Sync
                </Button>
              </>
            ) : progress.status === 'running' ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={handlePauseSync}
                  color="warning"
                >
                  Pause
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={handleStopSync}
                  color="error"
                >
                  Stop
                </Button>
              </>
            ) : progress.status === 'paused' ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={handleResumeSync}
                  color="primary"
                >
                  Resume
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={handleStopSync}
                  color="error"
                >
                  Stop
                </Button>
              </>
            ) : null}

            <Button
              variant="text"
              onClick={handleRevoke}
              color="error"
              sx={{ ml: 'auto' }}
            >
              Disconnect Account
            </Button>
          </Box>
        </Box>
      )}

      {/* Sync Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gmail Sync Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Batch Size"
                  type="number"
                  value={syncOptions.batchSize}
                  onChange={(e) => setSyncOptions({
                    ...syncOptions,
                    batchSize: parseInt(e.target.value) || 100
                  })}
                  inputProps={{ min: 10, max: 500 }}
                  helperText="Messages per batch (10-500)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Messages"
                  type="number"
                  value={syncOptions.maxMessages || ''}
                  onChange={(e) => setSyncOptions({
                    ...syncOptions,
                    maxMessages: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  helperText="Leave empty for all messages"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Search Query"
                  value={syncOptions.query}
                  onChange={(e) => setSyncOptions({
                    ...syncOptions,
                    query: e.target.value
                  })}
                  helperText="Gmail search query (e.g., 'from:someone@example.com')"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={syncOptions.startDate}
                  onChange={(e) => setSyncOptions({
                    ...syncOptions,
                    startDate: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={syncOptions.endDate}
                  onChange={(e) => setSyncOptions({
                    ...syncOptions,
                    endDate: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartSync}
            variant="contained"
            startIcon={<SyncIcon />}
          >
            Start Sync
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

export default GmailIntegration