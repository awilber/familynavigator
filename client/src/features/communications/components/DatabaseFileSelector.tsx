import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material'
import {
  Apple as AppleIcon,
  Storage as DatabaseIcon,
  FileUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'

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

interface DatabaseFileSelectorProps {
  onDatabaseSelected: (database: DatabaseFileInfo) => void
  selectedDatabase: DatabaseFileInfo | null
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fileInfo: {
    size: number
    lastModified: Date
    messageCount?: number
    contactCount?: number
    dateRange?: { start: Date, end: Date }
  }
}

const DatabaseFileSelector: React.FC<DatabaseFileSelectorProps> = ({
  onDatabaseSelected,
  selectedDatabase
}) => {
  const [systemDatabase, setSystemDatabase] = useState<DatabaseFileInfo | null>(null)
  const [uploadedDatabases, setUploadedDatabases] = useState<DatabaseFileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState<string | null>(null)
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    database: DatabaseFileInfo | null
    result: ValidationResult | null
  }>({ open: false, database: null, result: null })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    detectSystemDatabase()
    loadStoredDatabases()
  }, [])

  const detectSystemDatabase = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/messages/system-db-info')
      const data = await response.json()
      
      if (data.success && data.data) {
        setSystemDatabase(data.data)
      }
    } catch (error) {
      console.error('Error detecting system database:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStoredDatabases = async () => {
    try {
      const response = await fetch('/api/messages/stored-databases')
      const data = await response.json()
      
      if (data.success) {
        setUploadedDatabases(data.data || [])
      }
    } catch (error) {
      console.error('Error loading stored databases:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.name.toLowerCase().includes('chat') && !file.name.toLowerCase().endsWith('.db')) {
      alert('Please select a Messages database file (usually named chat.db)')
      return
    }

    if (file.size > 10 * 1024 * 1024 * 1024) { // 10GB limit
      alert('File size exceeds 10GB limit. Please select a smaller database file.')
      return
    }

    const uploadedDatabase: DatabaseFileInfo = {
      path: file.name,
      filename: file.name,
      size: file.size,
      lastModified: new Date(file.lastModified),
      isSystemFile: false,
      isValid: false, // Will be validated
      validationErrors: [],
      isAccessible: true,
      isInUse: false
    }

    // Start validation
    await validateDatabase(uploadedDatabase, file)
  }

  const validateDatabase = async (database: DatabaseFileInfo, file?: File) => {
    try {
      setValidating(database.path)
      
      const formData = new FormData()
      if (file) {
        formData.append('database', file)
      } else {
        formData.append('path', database.path)
      }

      const response = await fetch('/api/messages/validate-db', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        const validationResult: ValidationResult = data.data
        const validatedDatabase: DatabaseFileInfo = {
          ...database,
          isValid: validationResult.isValid,
          validationErrors: validationResult.errors,
          messageCount: validationResult.fileInfo.messageCount,
          size: validationResult.fileInfo.size,
          lastModified: validationResult.fileInfo.lastModified
        }

        // Show validation results
        setValidationDialog({
          open: true,
          database: validatedDatabase,
          result: validationResult
        })

        // Add to uploaded databases if valid and it's a file upload
        if (file && validationResult.isValid) {
          setUploadedDatabases(prev => [...prev, validatedDatabase])
        }

        // Update system database validation if it's system database
        if (database.isSystemFile && validationResult.isValid) {
          setSystemDatabase(validatedDatabase)
        }
      } else {
        const errorDatabase: DatabaseFileInfo = {
          ...database,
          isValid: false,
          validationErrors: [data.error || 'Validation failed']
        }
        
        setValidationDialog({
          open: true,
          database: errorDatabase,
          result: { isValid: false, errors: [data.error], warnings: [], fileInfo: { size: database.size, lastModified: database.lastModified } }
        })
      }
    } catch (error) {
      console.error('Error validating database:', error)
      setValidationDialog({
        open: true,
        database: { ...database, isValid: false, validationErrors: ['Network error during validation'] },
        result: { isValid: false, errors: ['Network error'], warnings: [], fileInfo: { size: database.size, lastModified: database.lastModified } }
      })
    } finally {
      setValidating(null)
    }
  }

  const handleDatabaseSelect = (database: DatabaseFileInfo) => {
    if (database.isValid) {
      onDatabaseSelected(database)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getValidationIcon = (database: DatabaseFileInfo) => {
    if (validating === database.path) {
      return <LinearProgress sx={{ width: 20, height: 20 }} />
    }
    if (!database.isValid) {
      return <ErrorIcon color="error" />
    }
    if (database.validationErrors.length > 0) {
      return <WarningIcon color="warning" />
    }
    return <CheckCircleIcon color="success" />
  }

  const renderDatabaseItem = (database: DatabaseFileInfo, isSelected: boolean = false) => (
    <ListItem 
      key={database.path}
      sx={{ 
        border: '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 1,
        mb: 1,
        backgroundColor: isSelected ? 'primary.light' : 'transparent'
      }}
    >
      <ListItemIcon>
        {database.isSystemFile ? <AppleIcon /> : <DatabaseIcon />}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">
              {database.filename}
            </Typography>
            {database.isSystemFile && (
              <Chip size="small" label="System" color="info" variant="outlined" />
            )}
            {database.isInUse && (
              <Chip size="small" label="In Use" color="warning" variant="outlined" />
            )}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary">
              Size: {formatFileSize(database.size)} • 
              Modified: {database.lastModified.toLocaleDateString()} • 
              {database.messageCount ? `${database.messageCount.toLocaleString()} messages` : 'Unknown count'}
            </Typography>
            {database.validationErrors.length > 0 && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                {database.validationErrors[0]}
              </Typography>
            )}
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getValidationIcon(database)}
          {database.isValid && (
            <Button
              size="small"
              variant={isSelected ? "contained" : "outlined"}
              onClick={() => handleDatabaseSelect(database)}
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          )}
          {!database.isValid && database.isAccessible && (
            <Tooltip title="Validate database">
              <IconButton 
                size="small" 
                onClick={() => validateDatabase(database)}
                disabled={validating === database.path}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DatabaseIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Select Messages Database
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a Messages database file to import and analyze
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: 200, mr: 2 }} />
            <Typography>Detecting system database...</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* System Database Section */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AppleIcon sx={{ mr: 2, color: '#007AFF' }} />
                <Typography variant="h6">Development Messages Database</Typography>
              </Box>
              
              {systemDatabase ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Development Database Ready
                    </Typography>
                    <Typography variant="body2">
                      Using a secure development copy of your Messages database. This ensures your live Messages data is never modified during development.
                    </Typography>
                  </Alert>
                  <List disablePadding>
                    {renderDatabaseItem(systemDatabase, selectedDatabase?.path === systemDatabase.path)}
                  </List>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Development Database Not Found
                  </Typography>
                  <Typography variant="body2">
                    No development copy found. You can upload a Messages database file manually below, or create a development copy if you have access to the system database.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UploadIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Upload Database File</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Upload a Messages database file (chat.db) from your system or backup. 
                  All uploaded files are processed securely and never modify your original data.
                </Typography>
              </Alert>

              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mb: 2 }}
              >
                Choose Database File
              </Button>

              {uploadedDatabases.length > 0 && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Uploaded Databases
                  </Typography>
                  <List disablePadding>
                    {uploadedDatabases.map(db => renderDatabaseItem(db, selectedDatabase?.path === db.path))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Validation Results Dialog */}
      <Dialog 
        open={validationDialog.open} 
        onClose={() => setValidationDialog({ open: false, database: null, result: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {validationDialog.result?.isValid ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
            Database Validation Results
          </Box>
        </DialogTitle>
        <DialogContent>
          {validationDialog.result && validationDialog.database && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {validationDialog.database.filename}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Size: {formatFileSize(validationDialog.result.fileInfo.size)} • 
                Modified: {validationDialog.result.fileInfo.lastModified.toLocaleDateString()}
                {validationDialog.result.fileInfo.messageCount && (
                  <> • {validationDialog.result.fileInfo.messageCount.toLocaleString()} messages</>
                )}
              </Typography>

              {validationDialog.result.isValid ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Database is valid and ready for import!
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Validation Failed
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationDialog.result.errors.map((error, index) => (
                      <li key={index}>
                        <Typography variant="body2">{error}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {validationDialog.result.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Warnings
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationDialog.result.warnings.map((warning, index) => (
                      <li key={index}>
                        <Typography variant="body2">{warning}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialog({ open: false, database: null, result: null })}>
            Close
          </Button>
          {validationDialog.result?.isValid && validationDialog.database && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleDatabaseSelect(validationDialog.database!)
                setValidationDialog({ open: false, database: null, result: null })
              }}
            >
              Select This Database
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DatabaseFileSelector