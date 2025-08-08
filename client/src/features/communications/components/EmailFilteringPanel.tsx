import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  ButtonGroup
} from '@mui/material'
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Email as EmailIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material'

interface EmailAddress {
  email_address: string
  display_name: string
  total_message_count: number
  incoming_count: number
  outgoing_count: number
  first_seen: string
  last_seen: string
  legal_importance_score: number
  communication_frequency: 'daily' | 'weekly' | 'monthly' | 'rarely'
  domain: string
}

interface EmailFilteringPanelProps {
  onFilterApply?: (query: string) => void
  onFilterClear?: () => void
  onExportResults?: () => void
}

const EmailFilteringPanel: React.FC<EmailFilteringPanelProps> = ({
  onFilterApply,
  onFilterClear,
  onExportResults
}) => {
  // Console log to verify component is being called
  console.log('🔍 EmailFilteringPanel component is being rendered!');
  
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('frequency')
  const [query, setQuery] = useState<string>('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadEmailAddresses()
  }, [sortBy])

  const loadEmailAddresses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/email-filtering/analysis?sortBy=${sortBy}`)
      const data = await response.json()
      
      if (data.success) {
        setEmailAddresses(data.data.emails || [])
      } else {
        setError(data.error || 'Failed to load email addresses')
      }
    } catch (err) {
      setError('Network error loading email addresses')
      console.error('Error loading email addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailClick = (emailAddress: string) => {
    const newQuery = `(from:${emailAddress} OR to:${emailAddress})`
    setQuery(newQuery)
  }

  const handleApplyFilter = async () => {
    if (!query.trim()) return
    
    try {
      setApplying(true)
      await onFilterApply?.(query)
    } catch (err) {
      console.error('Error applying filter:', err)
    } finally {
      setApplying(false)
    }
  }

  const handleClearFilter = () => {
    setQuery('')
    onFilterClear?.()
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'success'
      case 'weekly': return 'warning'
      case 'monthly': return 'info'
      case 'rarely': return 'default'
      default: return 'default'
    }
  }

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const sortButtons = [
    { key: 'frequency', label: 'Frequency', icon: <SortIcon /> },
    { key: 'recent', label: 'Recent', icon: <TimeIcon /> },
    { key: 'alphabetical', label: 'A-Z', icon: <SortIcon /> },
    { key: 'legal_relevance', label: 'Legal', icon: <FilterIcon /> }
  ]

  return (
    <Card sx={{ mb: 3, minHeight: 500 }}>
      <CardContent sx={{ minHeight: 450 }}>
        {/* DEBUG: Verification div - remove after testing */}
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '8px', 
          margin: '8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          borderRadius: '4px'
        }}>
          ✅ EmailFilteringPanel loaded successfully
        </div>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <FilterIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Email Address Filtering
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Left Panel: Email Address Discovery */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ height: '100%', minHeight: 400 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Discovered Email Addresses
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {emailAddresses.length} addresses
                  </Typography>
                </Box>

                {/* Sort Options */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Sort by:
                  </Typography>
                  <ButtonGroup size="small" variant="outlined">
                    {sortButtons.map((button) => (
                      <Button
                        key={button.key}
                        onClick={() => setSortBy(button.key)}
                        variant={sortBy === button.key ? 'contained' : 'outlined'}
                        startIcon={button.icon}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {button.label}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Box>

                {/* Email Address List */}
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  ) : emailAddresses.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                      No email addresses found. Try syncing some Gmail messages first.
                    </Typography>
                  ) : (
                    emailAddresses.map((email) => (
                      <Tooltip
                        key={email.email_address}
                        title={
                          <Box>
                            <Typography variant="body2">
                              <strong>{email.total_message_count}</strong> total messages
                            </Typography>
                            <Typography variant="body2">
                              {email.incoming_count} incoming, {email.outgoing_count} outgoing
                            </Typography>
                            <Typography variant="body2">
                              First seen: {new Date(email.first_seen).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2">
                              Last seen: {formatLastSeen(email.last_seen)}
                            </Typography>
                            <Typography variant="body2">
                              Legal importance: {email.legal_importance_score}/10
                            </Typography>
                          </Box>
                        }
                        arrow
                      >
                        <Box
                          onClick={() => handleEmailClick(email.email_address)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            mb: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              backgroundColor: (theme) => theme.palette.mode === 'dark' 
                                ? 'rgba(25, 118, 210, 0.08)' 
                                : 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {email.display_name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                size="small"
                                label={`${email.total_message_count} msgs`}
                                color={getFrequencyColor(email.communication_frequency) as any}
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatLastSeen(email.last_seen)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Tooltip>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Center: Quick Actions */}
          <Grid item xs={12} md={2}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'row', md: 'column' },
              gap: 2,
              height: '100%',
              minHeight: 400,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Divider 
                orientation={{ xs: 'horizontal', md: 'vertical' }}
                sx={{ display: { xs: 'block', md: 'block' } }}
              />
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', md: 'column' },
                gap: 1
              }}>
                <Button
                  variant="contained"
                  startIcon={applying ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={handleApplyFilter}
                  disabled={!query.trim() || applying}
                  size="small"
                  fullWidth
                >
                  {applying ? 'Applying...' : 'Apply Filter'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilter}
                  disabled={!query.trim()}
                  size="small"
                  fullWidth
                >
                  Clear All
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={onExportResults}
                  disabled={!query.trim()}
                  size="small"
                  fullWidth
                >
                  Export
                </Button>
              </Box>
              
              <Divider 
                orientation={{ xs: 'horizontal', md: 'vertical' }}
                sx={{ display: { xs: 'block', md: 'block' } }}
              />
            </Box>
          </Grid>

          {/* Right Panel: Gmail Query Builder */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ height: '100%', minHeight: 400 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Gmail Query Builder
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Filter Query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., from:person@example.com OR to:person@example.com"
                  helperText="Click an email address on the left or build your own Gmail search query"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Gmail Search Operators:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {['from:', 'to:', 'subject:', 'has:', 'in:', 'is:', 'after:', 'before:'].map((operator) => (
                      <Chip
                        key={operator}
                        label={operator}
                        size="small"
                        variant="outlined"
                        onClick={() => setQuery(prev => prev + operator)}
                        sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Examples:</strong>
                  </Typography>
                  <Box sx={{ pl: 1 }}>
                    <Typography variant="caption" component="div" color="text.secondary">
                      • <code>from:john@example.com</code> - Messages from John
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      • <code>to:mary@example.com</code> - Messages to Mary
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      • <code>(from:john@example.com OR to:john@example.com)</code> - Any messages involving John
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      • <code>subject:"court date" has:attachment</code> - Court emails with attachments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default EmailFilteringPanel