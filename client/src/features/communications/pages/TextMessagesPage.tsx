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
import DatabaseFileSelector from '../components/DatabaseFileSelector'

interface DatabaseFileInfo {
  path: string
  filename: string
  size: number
  lastModified: Date
  isSystemFile: boolean
  isValid: boolean
  messageCount?: number
  validationErrors: string[]
  isAccessible: boolean
  isInUse: boolean
}

interface TextMessageStatus {
  isConnected: boolean
  selectedDatabase?: DatabaseFileInfo
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
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseFileInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [analysisData, setAnalysisData] = useState<{
    statistics?: any
    performance?: any
    schema?: any
    contacts?: any
    loading: boolean
    error?: string
  }>({ loading: false })

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
      // Update status based on selected database
      setStatus({
        isConnected: selectedDatabase?.isValid || false,
        selectedDatabase,
        lastSync: undefined,
        totalMessages: selectedDatabase?.messageCount || 0,
        totalContacts: 0
      })
    } catch (error) {
      console.error('Error checking text message status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDatabaseSelected = (database: DatabaseFileInfo) => {
    console.log('Database selected:', database)
    setSelectedDatabase(database)
    setStatus(prev => ({
      ...prev,
      isConnected: database.isValid,
      selectedDatabase: database,
      totalMessages: database.messageCount || 0
    }))
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

  const loadAnalysisData = async () => {
    if (!selectedDatabase?.isValid) return

    try {
      setAnalysisData(prev => ({ ...prev, loading: true, error: undefined }))
      
      // Load all analysis data in parallel
      const [statisticsRes, performanceRes, schemaRes, contactsRes] = await Promise.all([
        fetch('/api/messages/statistics'),
        fetch('/api/messages/performance-analysis'),
        fetch('/api/messages/schema-info'),
        fetch('/api/messages/contacts')
      ])

      const [statistics, performance, schema, contacts] = await Promise.all([
        statisticsRes.json(),
        performanceRes.json(),
        schemaRes.json(),
        contactsRes.json()
      ])

      setAnalysisData({
        statistics: statistics.success ? statistics.data : null,
        performance: performance.success ? performance.data : null,
        schema: schema.success ? schema.data : null,
        contacts: contacts.success ? contacts.data : null,
        loading: false,
        error: undefined
      })
    } catch (error) {
      console.error('Error loading analysis data:', error)
      setAnalysisData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load analysis data'
      }))
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
                {status.isConnected ? 'Database connected and validated' : 'Select a database to begin'}
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={status.isConnected ? <CheckCircleIcon /> : <DatabaseIcon />}
            label={status.isConnected ? 'Connected' : 'Select Database'}
            color={status.isConnected ? 'success' : 'primary'}
            variant="filled"
          />
        </Box>

        {!status.isConnected && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Database Selection Required
            </Typography>
            <Typography variant="body2">
              Select a Messages database file to import and analyze text messages. The system will automatically detect your Messages app database or you can upload a backup file.
            </Typography>
          </Alert>
        )}

        {status.isConnected && status.selectedDatabase && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Database Validated Successfully
              </Typography>
              <Typography variant="body2">
                The selected database is valid and ready for import. All processing will be done securely with a local copy.
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Chip 
                icon={status.selectedDatabase.isSystemFile ? <AppleIcon /> : <DatabaseIcon />}
                label={status.selectedDatabase.isSystemFile ? 'System Database' : 'Uploaded File'}
                color="info"
                variant="outlined"
              />
              <Chip 
                label={`${(status.selectedDatabase.size / (1024 * 1024)).toFixed(1)} MB`}
                color="default"
                variant="outlined"
              />
              <Chip 
                label={`${status.selectedDatabase.messageCount?.toLocaleString() || 0} messages`}
                color="success"
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Database:</strong> {status.selectedDatabase.filename}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Last Modified:</strong> {status.selectedDatabase.lastModified.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Total Messages:</strong> {status.totalMessages?.toLocaleString() || 0}
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
            disabled={!status.isConnected || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Messages'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            disabled={!status.isConnected}
          >
            Export Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            disabled={!status.isConnected}
          >
            Sync Now
          </Button>
        </Box>

        {!status.isConnected && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Select a Messages database first to enable import functionality.
            </Typography>
          </Alert>
        )}
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

  const renderAnalysisAndTiming = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Database Analysis & Performance Metrics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon />}
          onClick={loadAnalysisData}
          disabled={analysisData.loading || !selectedDatabase?.isValid}
        >
          {analysisData.loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </Box>

      {analysisData.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Analysis Error</Typography>
          <Typography variant="body2">{analysisData.error}</Typography>
        </Alert>
      )}

      {analysisData.loading && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Running comprehensive database analysis...</Typography>
          </CardContent>
        </Card>
      )}

      {/* Statistics Panel */}
      {analysisData.statistics && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Message Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {analysisData.statistics.totalMessages?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary" fontWeight="bold">
                    {analysisData.statistics.totalContacts?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Total Contacts</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {analysisData.statistics.totalConversations?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Conversations</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {analysisData.statistics.dateRange?.spanDays || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Days Span</Typography>
                </Box>
              </Grid>
            </Grid>
            
            {analysisData.statistics.frequencyAnalysis && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  Frequency Analysis
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Daily Average</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {analysisData.statistics.frequencyAnalysis.dailyAverage}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Monthly Average</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {analysisData.statistics.frequencyAnalysis.monthlyAverage}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Peak Day</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {new Date(analysisData.statistics.frequencyAnalysis.peakDay).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Peak Count</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {analysisData.statistics.frequencyAnalysis.peakCount}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Panel */}
      {analysisData.performance && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Performance Analysis & Timing
            </Typography>
            
            {analysisData.performance.optimizationSummary && (
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main" fontWeight="bold">
                        {analysisData.performance.optimizationSummary.totalQueries}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Queries Tested</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main" fontWeight="bold">
                        {analysisData.performance.optimizationSummary.slowQueries}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Slow Queries</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {analysisData.performance.optimizationSummary.averageQueryTime}ms
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Average Time</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        {analysisData.performance.optimizationSummary.recommendedIndexCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Optimization Recs</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {analysisData.performance.slowQueries && analysisData.performance.slowQueries.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  Timing Details (Slow Queries >100ms)
                </Typography>
                {analysisData.performance.slowQueries.map((query: any, index: number) => (
                  <Alert severity="warning" sx={{ mb: 1 }} key={index}>
                    <Typography variant="body2" fontWeight="bold">
                      {query.query.split(':')[0]} - {query.executionTime}ms
                    </Typography>
                    <Typography variant="caption">
                      Scanned: {query.rowsScanned.toLocaleString()} rows • 
                      Returned: {query.rowsReturned} results • 
                      Memory: {(query.memoryUsage / 1024).toFixed(1)}KB
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}

            {analysisData.performance.optimizationSummary?.estimatedPerformanceGain && (
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold">
                  Performance Improvement Potential: {analysisData.performance.optimizationSummary.estimatedPerformanceGain}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Panel */}
      {analysisData.schema && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Database Schema Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Database contains {analysisData.schema.tables?.length || 0} tables with detailed schema analysis
            </Typography>
            
            {analysisData.schema.summary && (
              <Box>
                <Typography variant="body2">
                  <strong>Version:</strong> {analysisData.schema.summary.version}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Tables:</strong> {analysisData.schema.summary.tableCount}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Rows:</strong> {analysisData.schema.summary.totalRows?.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Analysis Time:</strong> {new Date(analysisData.schema.summary.analysisDate).toLocaleString()}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {!analysisData.statistics && !analysisData.loading && !analysisData.error && (
        <Alert severity="info">
          <Typography variant="body2" fontWeight="bold">
            Test Information & Timing Panels Ready
          </Typography>
          <Typography variant="body2">
            Click "Run Analysis" to load comprehensive database statistics, performance metrics, and timing information for the selected Messages database.
          </Typography>
        </Alert>
      )}
    </Box>
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
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Database
              {!selectedDatabase && <Chip size="small" label="Required" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
              {selectedDatabase?.isValid && <Chip size="small" label="Ready" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
            </Box>
          }
        />
        <Tab 
          label="Import"
          disabled={!selectedDatabase?.isValid}
        />
        <Tab 
          label="Analysis & Timing"
          disabled={!selectedDatabase?.isValid}
        />
        <Tab label="Features" />
        <Tab label="Settings" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {renderConnectionStatus()}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <DatabaseFileSelector
            onDatabaseSelected={handleDatabaseSelected}
            selectedDatabase={selectedDatabase}
          />
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {selectedDatabase ? (
            <>
              {renderImportControls()}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  The import process will read your Messages app database and create a local copy of your text message history for analysis. 
                  This process respects your privacy and all data remains on your device.
                </Typography>
              </Alert>
            </>
          ) : (
            <Alert severity="warning">
              <Typography variant="body2" fontWeight="bold">
                Database Selection Required
              </Typography>
              <Typography variant="body2">
                Please select a Messages database in the Database tab before proceeding with import.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 3 && renderAnalysisAndTiming()}

      {activeTab === 4 && renderFeaturePreview()}

      {activeTab === 5 && renderSettings()}
    </Box>
  )
}

export default TextMessagesPage