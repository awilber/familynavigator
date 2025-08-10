import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  ButtonGroup,
  IconButton,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Google as GoogleIcon,
  Message as MessageIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
  PlayArrow as PlayIcon,
  Storage as DataIcon,
  CloudSync as CloudSyncIcon
} from '@mui/icons-material'

interface GmailStatus {
  isAuthenticated: boolean
  profile?: {
    emailAddress: string
    messagesTotal: number
    threadsTotal: number
  }
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
  currentOperation: string
  operationDetails: string
  messagesPerSecond: number
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
}

const CompactDataSources: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>('gmail')
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ isAuthenticated: false })
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    totalMessages: 0,
    processedMessages: 0,
    currentBatch: 0,
    totalBatches: 0,
    currentOperation: 'Idle',
    operationDetails: 'Service ready to start sync',
    messagesPerSecond: 0,
    connectionStatus: 'disconnected'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadGmailStatus()
    loadSyncProgress()
  }, [])

  const loadGmailStatus = async () => {
    try {
      const response = await fetch('/api/gmail/status')
      const data = await response.json()
      
      if (data.success) {
        setGmailStatus(data.data)
      }
    } catch (error) {
      console.error('Error loading Gmail status:', error)
    }
  }

  const loadSyncProgress = async () => {
    try {
      const response = await fetch('/api/gmail/sync/progress')
      const data = await response.json()
      
      if (data.success) {
        setSyncProgress(data.data)
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
      setLoading(true)
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10, maxMessages: 10 })
      })
      
      const data = await response.json()
      if (data.success) {
        setSyncProgress(data.data)
      }
    } catch (error) {
      console.error('Error starting test sync:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const getProgressPercentage = (): number => {
    if (syncProgress.totalMessages === 0) return 0
    return Math.round((syncProgress.processedMessages / syncProgress.totalMessages) * 100)
  }

  const getStatusColor = () => {
    switch (syncProgress.status) {
      case 'completed': return 'success'
      case 'error': return 'error'
      case 'running': return 'primary'
      case 'paused': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Data Sources Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pl: 1 }}>
        <DataIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
          Data Sources
        </Typography>
      </Box>

      {/* Gmail Integration Section */}
      <Accordion 
        expanded={expanded === 'gmail'} 
        onChange={handleAccordionChange('gmail')}
        sx={{ 
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          mb: 0.5
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
          sx={{ 
            minHeight: 32, 
            '& .MuiAccordionSummary-content': { 
              margin: '8px 0',
              alignItems: 'center'
            },
            pl: 2,
            pr: 1,
            py: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <GoogleIcon sx={{ fontSize: 16, color: '#EA4335' }} />
            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
              Gmail
            </Typography>
            {gmailStatus.isAuthenticated && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                label="Connected"
                size="small"
                color="success"
                variant="outlined"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  ml: 'auto',
                  '& .MuiChip-icon': { fontSize: 10 }
                }}
              />
            )}
            {!gmailStatus.isAuthenticated && (
              <Chip
                label="Disconnected"
                size="small"
                color="default"
                variant="outlined"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  ml: 'auto'
                }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}>
          <Box sx={{ pl: 1 }}>
            {!gmailStatus.isAuthenticated ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Connect your Gmail account to import email communications.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<GoogleIcon sx={{ fontSize: 12 }} />}
                  onClick={handleAuthenticate}
                  sx={{
                    backgroundColor: '#EA4335',
                    '&:hover': { backgroundColor: '#d33b2a' },
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1,
                    height: 26
                  }}
                >
                  Connect Gmail
                </Button>
              </Box>
            ) : (
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {gmailStatus.profile?.emailAddress}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {gmailStatus.profile?.messagesTotal?.toLocaleString()} messages
                  </Typography>
                </Box>

                {syncProgress.status === 'running' && (
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                        Sync Progress
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                        {getProgressPercentage()}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={getProgressPercentage()} 
                      sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      {syncProgress.processedMessages} of {syncProgress.totalMessages} messages
                    </Typography>
                  </Box>
                )}

                {syncProgress.status === 'error' && (
                  <Alert severity="error" sx={{ mb: 1, fontSize: '0.7rem', py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                      {syncProgress.error}
                    </Typography>
                  </Alert>
                )}

                <ButtonGroup size="small" sx={{ '& .MuiButton-root': { fontSize: '0.65rem', py: 0.25, px: 0.75 } }}>
                  <Tooltip title="Test connection with 10 messages">
                    <Button
                      startIcon={loading ? <CircularProgress size={10} /> : <SyncIcon sx={{ fontSize: 10 }} />}
                      onClick={handleTestSync}
                      disabled={loading}
                      variant="outlined"
                    >
                      Test
                    </Button>
                  </Tooltip>
                  <Button
                    startIcon={<CloudSyncIcon sx={{ fontSize: 10 }} />}
                    variant="outlined"
                    disabled
                  >
                    Full Sync
                  </Button>
                </ButtonGroup>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Text Messages Section */}
      <Accordion 
        expanded={expanded === 'messages'} 
        onChange={handleAccordionChange('messages')}
        sx={{ 
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          mb: 0.5
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
          sx={{ 
            minHeight: 32, 
            '& .MuiAccordionSummary-content': { 
              margin: '8px 0',
              alignItems: 'center'
            },
            pl: 2,
            pr: 1,
            py: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MessageIcon sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
              Text Messages
            </Typography>
            <Chip
              label="Soon"
              size="small"
              color="info"
              variant="outlined"
              sx={{ 
                height: 18, 
                fontSize: '0.6rem',
                ml: 'auto'
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}>
          <Box sx={{ pl: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mb: 1 }}>
              Import and analyze text messages from your device's Messages app.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled
              sx={{ fontSize: '0.7rem', py: 0.5, px: 1, height: 26 }}
            >
              Coming Soon
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Files Section */}
      <Accordion 
        expanded={expanded === 'files'} 
        onChange={handleAccordionChange('files')}
        sx={{ 
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
          sx={{ 
            minHeight: 32, 
            '& .MuiAccordionSummary-content': { 
              margin: '8px 0',
              alignItems: 'center'
            },
            pl: 2,
            pr: 1,
            py: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DocumentIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
              Files
            </Typography>
            <Chip
              label="Soon"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ 
                height: 18, 
                fontSize: '0.6rem',
                ml: 'auto'
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}>
          <Box sx={{ pl: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mb: 1 }}>
              Upload and analyze documents, PDFs, and other file types.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled
              sx={{ fontSize: '0.7rem', py: 0.5, px: 1, height: 26 }}
            >
              Coming Soon
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

export default CompactDataSources