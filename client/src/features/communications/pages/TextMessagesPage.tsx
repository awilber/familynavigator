import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tabs,
  Tab,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  LinearProgress,
  CircularProgress
} from '@mui/material'
import {
  Message as MessageIcon,
  Apple as AppleIcon,
  Smartphone as SmartphoneIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Storage as DatabaseIcon,
  FileUpload as FileUploadIcon,
  History as HistoryIcon
} from '@mui/icons-material'

interface TextMessageStatus {
  isConnected: boolean
  databasePath?: string
  lastSync?: string
  totalMessages?: number
  totalContacts?: number
  dateRange?: {
    earliest: string
    latest: string
  }
}

const TextMessagesPage: React.FC = () => {
  const [status, setStatus] = useState<TextMessageStatus>({ isConnected: false })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)

  const [settings, setSettings] = useState({
    autoSync: false,
    syncFrequency: 'daily',
    includeDeleted: false,
    anonymizeContacts: false,
    backupBeforeImport: true
  })

  useEffect(() => {
    checkTextMessageStatus()
  }, [])

  const checkTextMessageStatus = async () => {
    try {
      setLoading(true)
      // Placeholder for actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock status - in real implementation, this would check for Messages.app database access
      setStatus({
        isConnected: false,
        databasePath: '~/Library/Messages/chat.db',
        lastSync: undefined,
        totalMessages: 0,
        totalContacts: 0
      })
    } catch (error) {
      console.error('Error checking text message status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportMessages = async () => {
    try {
      setIsImporting(true)
      setImportProgress(0)
      
      // Simulate import progress
      const interval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsImporting(false)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 500)
      
      // Placeholder for actual import logic
      console.log('Starting text message import...')
    } catch (error) {
      console.error('Error importing messages:', error)
      setIsImporting(false)
    }
  }

  const renderConnectionStatus = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AppleIcon sx={{ fontSize: 32, color: '#007AFF', mr: 2 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                macOS Messages Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status.isConnected ? 'Connected and ready' : 'Not connected'}
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={status.isConnected ? <CheckCircleIcon /> : <WarningIcon />}
            label={status.isConnected ? 'Connected' : 'Coming Soon'}
            color={status.isConnected ? 'success' : 'warning'}
            variant="filled"
          />
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            Messages App Integration - Coming Soon
          </Typography>
          <Typography variant="body2">
            This feature will import and analyze text messages from your macOS Messages app by accessing the local chat.db database.
          </Typography>
        </Alert>

        {status.isConnected && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Database Path:</strong> {status.databasePath}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Total Messages:</strong> {status.totalMessages?.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Total Contacts:</strong> {status.totalContacts?.toLocaleString()}
            </Typography>
            {status.lastSync && (
              <Typography variant="body2">
                <strong>Last Sync:</strong> {new Date(status.lastSync).toLocaleString()}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )

  const renderImportControls = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Import Control
        </Typography>

        {isImporting && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Importing messages...
              </Typography>
              <Typography variant="body2">
                {Math.round(importProgress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={importProgress} 
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Processing Messages app database
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<DatabaseIcon />}
            onClick={handleImportMessages}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Messages'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            disabled
          >
            Export Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            disabled
          >
            Sync Now
          </Button>
        </Box>
      </CardContent>
    </Card>
  )

  const renderFeaturePreview = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Planned Features
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <DatabaseIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Messages Database Access"
              secondary="Read-only access to ~/Library/Messages/chat.db for importing message history"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Privacy-First Processing"
              secondary="All processing happens locally - messages never leave your device"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <AnalyticsIcon color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Communication Analysis"
              secondary="Analyze message patterns, frequency, and sentiment with contacts"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <HistoryIcon color="warning" />
            </ListItemIcon>
            <ListItemText 
              primary="Historical Timeline"
              secondary="Complete timeline view of text communications integrated with emails"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  )

  const renderSettings = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Import Settings
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoSync}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                />
              }
              label="Enable Automatic Sync"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Sync Frequency"
              value={settings.syncFrequency}
              onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value }))}
              SelectProps={{ native: true }}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual Only</option>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.includeDeleted}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeDeleted: e.target.checked }))}
                />
              }
              label="Include Deleted Messages (if available)"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.anonymizeContacts}
                  onChange={(e) => setSettings(prev => ({ ...prev, anonymizeContacts: e.target.checked }))}
                />
              }
              label="Anonymize Contact Names"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.backupBeforeImport}
                  onChange={(e) => setSettings(prev => ({ ...prev, backupBeforeImport: e.target.checked }))}
                />
              }
              label="Create Backup Before Import"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Alert severity="warning">
              <Typography variant="body2" fontWeight="bold">
                Security Notice
              </Typography>
              <Typography variant="body2">
                This feature requires read access to your Messages database. All processing is done locally and no data is transmitted externally.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>Loading text message integration...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MessageIcon sx={{ fontSize: 40, color: '#007AFF', mr: 2 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Text Messages Integration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Import and analyze text messages from macOS Messages app
          </Typography>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Import" />
        <Tab label="Features" />
        <Tab label="Settings" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {renderConnectionStatus()}
          {renderImportControls()}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {renderImportControls()}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              The import process will read your Messages app database and create a local copy of your text message history for analysis. 
              This process respects your privacy and all data remains on your device.
            </Typography>
          </Alert>
        </Box>
      )}

      {activeTab === 2 && renderFeaturePreview()}

      {activeTab === 3 && renderSettings()}
    </Box>
  )
}

export default TextMessagesPage