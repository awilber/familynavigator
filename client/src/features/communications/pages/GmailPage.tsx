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
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material'
import {
  Google as GoogleIcon,
  Sync as SyncIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  CloudSync as CloudSyncIcon,
  Refresh as RefreshIcon
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

const GmailPage: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)

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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success && data.data?.authUrl) {
        window.location.href = data.data.authUrl
      }
    } catch (error) {
      console.error('Error starting Gmail authentication:', error)
    }
  }

  const handleTestSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10, maxMessages: 10 })
      })
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error starting test sync:', error)
    }
  }

  const handleFullSync = async () => {
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncOptions)
      })
      
      const data = await response.json()
      if (data.success) {
        setProgress(data.data)
      }
    } catch (error) {
      console.error('Error starting full sync:', error)
    }
  }

  const handleStopSync = async () => {
    try {
      await fetch('/api/gmail/sync/stop', { method: 'POST' })
      loadSyncProgress()
    } catch (error) {
      console.error('Error stopping sync:', error)
    }
  }

  const handleProcessFiltered = async () => {
    if (!status.isAuthenticated) {
      alert('Please authenticate with Gmail first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessProgress(0)
      
      // Prepare filtering parameters
      const filterParams = {
        startDate: syncOptions.startDate || null,
        endDate: syncOptions.endDate || null,
        maxMessages: syncOptions.maxMessages || 1000,
        query: syncOptions.query || null,
        batchSize: syncOptions.batchSize
      }
      
      console.log('Starting Gmail filtered processing with options:', filterParams)
      
      // Call the backend to process emails with filters
      const response = await fetch('/api/gmail/process-filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters: filterParams
        })
      })
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`)
      }
      
      // Track progress
      const interval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 95) {
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 1000)
      
      const result = await response.json()
      
      clearInterval(interval)
      setProcessProgress(100)
      
      console.log('Gmail processing completed:', result)
      alert(`Processing completed! Processed ${result.processedEmails || 0} emails`)
      
      // Refresh status to show new results
      loadGmailStatus()
      
      setTimeout(() => {
        setIsProcessing(false)
        setProcessProgress(0)
      }, 2000)
      
    } catch (error) {
      console.error('Error processing Gmail messages:', error)
      alert(`Error processing emails: ${error.message}`)
      setIsProcessing(false)
      setProcessProgress(0)
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed': return 'success'
      case 'error': return 'error'
      case 'running': return 'primary'
      case 'paused': return 'warning'
      default: return 'default'
    }
  }

  const getProgressPercentage = (): number => {
    if (progress.totalMessages === 0) return 0
    return Math.round((progress.processedMessages / progress.totalMessages) * 100)
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const renderConnectionStatus = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GoogleIcon sx={{ fontSize: 32, color: '#EA4335', mr: 2 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Gmail Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status.isAuthenticated ? 'Connected and ready' : 'Not connected'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={status.isAuthenticated ? <CheckCircleIcon /> : <ErrorIcon />}
              label={status.isAuthenticated ? 'Connected' : 'Disconnected'}
              color={status.isAuthenticated ? 'success' : 'error'}
              variant="filled"
            />
            <IconButton onClick={loadGmailStatus} size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {status.isAuthenticated && status.profile && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Account:</strong> {status.profile.emailAddress}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Total Messages:</strong> {status.profile.messagesTotal?.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>Total Threads:</strong> {status.profile.threadsTotal?.toLocaleString()}
            </Typography>
          </Box>
        )}

        {!status.isAuthenticated && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Connect your Gmail account to import and analyze email communications.
            </Alert>
            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleAuthenticate}
              sx={{
                backgroundColor: '#EA4335',
                '&:hover': { backgroundColor: '#d33b2a' }
              }}
            >
              Connect Gmail Account
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  const renderSyncControls = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Sync Control
          </Typography>
          <IconButton onClick={() => setSettingsOpen(true)} size="small">
            <SettingsIcon />
          </IconButton>
        </Box>

        {progress.status === 'running' && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {progress.currentOperation}
              </Typography>
              <Typography variant="body2">
                {getProgressPercentage()}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getProgressPercentage()} 
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {progress.processedMessages} of {progress.totalMessages} messages processed
              {progress.messagesPerSecond > 0 && ` • ${progress.messagesPerSecond.toFixed(1)}/sec`}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!status.isAuthenticated ? (
            <Button disabled variant="outlined">
              Connect Gmail First
            </Button>
          ) : (
            <>
              {progress.status !== 'running' ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={handleTestSync}
                  >
                    Test Sync (10 messages)
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CloudSyncIcon />}
                    onClick={handleFullSync}
                  >
                    Full Sync
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopSync}
                >
                  Stop Sync
                </Button>
              )}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  )

  const renderSyncStatus = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Sync Status
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <Chip
                size="small"
                label={progress.status.toUpperCase()}
                color={getStatusColor()}
              />
            </ListItemIcon>
            <ListItemText 
              primary="Current Status"
              secondary={progress.operationDetails}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <AnalyticsIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Performance"
              secondary={`${progress.messagesPerSecond.toFixed(1)} messages/sec`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Connection"
              secondary={progress.connectionStatus}
            />
          </ListItem>

          {progress.error && (
            <ListItem>
              <ListItemIcon>
                <ErrorIcon color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Last Error"
                secondary={progress.error}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  )

  const renderErrorLog = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Error Log
        </Typography>

        {progress.detailedErrors.length === 0 ? (
          <Typography color="text.secondary">
            No errors recorded
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {progress.detailedErrors.map((error, index) => (
              <Alert
                key={index}
                severity={error.isCritical ? 'error' : 'warning'}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {error.operation}
                </Typography>
                <Typography variant="caption">
                  {new Date(error.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  {error.error}
                </Typography>
                {error.retryCount > 0 && (
                  <Typography variant="caption">
                    Retries: {error.retryCount}
                  </Typography>
                )}
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>Loading Gmail integration...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <GoogleIcon sx={{ fontSize: 40, color: '#EA4335', mr: 2 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Gmail Integration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure and manage your Gmail email synchronization
          </Typography>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Sync Control" />
        <Tab label="Status & Logs" />
        <Tab label="Settings" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {renderConnectionStatus()}
          {renderSyncControls()}
        </Box>
      )}

      {activeTab === 1 && status.isAuthenticated && (
        <Box>
          {renderSyncControls()}
          {renderSyncStatus()}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {renderSyncStatus()}
          {renderErrorLog()}
        </Box>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Sync Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Batch Size"
                  type="number"
                  value={syncOptions.batchSize}
                  onChange={(e) => setSyncOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Messages (optional)"
                  type="number"
                  value={syncOptions.maxMessages || ''}
                  onChange={(e) => setSyncOptions(prev => ({ ...prev, maxMessages: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Gmail Query Filter"
                  value={syncOptions.query}
                  onChange={(e) => setSyncOptions(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="e.g., from:example@domain.com OR has:attachment"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={syncOptions.startDate}
                  onChange={(e) => setSyncOptions(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={syncOptions.endDate}
                  onChange={(e) => setSyncOptions(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showVerboseLogging}
                      onChange={(e) => setShowVerboseLogging(e.target.checked)}
                    />
                  }
                  label="Enable Verbose Logging"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Filtered Email Processing
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Processing Information
                  </Typography>
                  <Typography variant="body2">
                    {syncOptions.startDate || syncOptions.endDate ? 
                      `Date filtering active: ${syncOptions.startDate || 'beginning'} to ${syncOptions.endDate || 'present'}` :
                      'No date filtering - all emails will be processed'
                    }. Limited to {syncOptions.maxMessages || 1000} emails maximum.
                    {syncOptions.query && ` Query filter: "${syncOptions.query}"`}
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SyncIcon />}
                  onClick={handleProcessFiltered}
                  disabled={!status.isAuthenticated || isProcessing}
                  sx={{ mr: 2 }}
                >
                  {isProcessing ? 'Processing Emails...' : 'Process Emails with Current Settings'}
                </Button>
                {isProcessing && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setIsProcessing(false)}
                      sx={{ mr: 2 }}
                    >
                      Cancel Processing
                    </Button>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress variant="determinate" value={processProgress} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Math.round(processProgress)}% completed
                      </Typography>
                    </Box>
                  </>
                )}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Alert severity="warning">
                  <Typography variant="body2" fontWeight="bold">
                    Security Notice
                  </Typography>
                  <Typography variant="body2">
                    All email processing uses your authenticated Gmail connection. Processing is done locally and data remains secure.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default GmailPage