import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  AutoFixHigh as AutoIcon,
  TrendingUp as TrendingIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon
} from '@mui/icons-material'

interface EmailAddressMetrics {
  email_address: string
  domain: string
  total_message_count: number
  incoming_count: number
  outgoing_count: number
  first_seen: string
  last_seen: string
  recent_activity_score: number
  communication_frequency: 'daily' | 'weekly' | 'monthly' | 'sporadic'
  legal_importance_score: number
  display_name?: string
  contact_id?: number
}

interface FilterPattern {
  id?: number
  pattern: string
  patternType: 'exact' | 'domain' | 'wildcard' | 'regex'
  appliesToFields: string[]
  isActive: boolean
  legalRelevance: 'high' | 'medium' | 'low'
  matchCount: number
  estimatedMatches?: number
}

interface FrequencyAnalysis {
  topAddresses: EmailAddressMetrics[]
  topDomains: Array<{
    domain: string
    count: number
    addresses: string[]
  }>
  recentlyActive: EmailAddressMetrics[]
  legallyRelevant: EmailAddressMetrics[]
  sortBy: string
}

export const EmailFilteringPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [frequencyData, setFrequencyData] = useState<FrequencyAnalysis | null>(null)
  const [activeFilters, setActiveFilters] = useState<FilterPattern[]>([])
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set())
  const [customPattern, setCustomPattern] = useState('')
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical' | 'recent' | 'legal_relevance'>('frequency')
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newPatternType, setNewPatternType] = useState<'exact' | 'domain' | 'wildcard' | 'regex'>('exact')
  const [newPatternFields, setNewPatternFields] = useState<string[]>(['from', 'to', 'cc'])

  useEffect(() => {
    loadFrequencyAnalysis()
    loadActiveFilters()
  }, [sortBy])

  const loadFrequencyAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/email-filtering/analysis?sortBy=${sortBy}`)
      const data = await response.json()
      if (data.success) {
        setFrequencyData(data.data)
      }
    } catch (error) {
      console.error('Failed to load frequency analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActiveFilters = async () => {
    try {
      const response = await fetch('/api/email-filtering/patterns')
      const data = await response.json()
      if (data.success) {
        setActiveFilters(data.data)
      }
    } catch (error) {
      console.error('Failed to load active filters:', error)
    }
  }

  const handleAddressToggle = (email: string) => {
    const newSelected = new Set(selectedAddresses)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedAddresses(newSelected)
  }

  const addSelectedAddresses = async () => {
    setLoading(true)
    try {
      const patterns = Array.from(selectedAddresses).map(email => ({
        pattern: email,
        patternType: 'exact',
        fields: ['from', 'to', 'cc', 'bcc'],
        legalRelevance: 'high',
        createdBy: 'user_selection'
      }))

      const response = await fetch('/api/email-filtering/patterns/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patterns })
      })

      if (response.ok) {
        setSelectedAddresses(new Set())
        await loadActiveFilters()
      }
    } catch (error) {
      console.error('Failed to add patterns:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCustomPattern = async () => {
    if (!customPattern.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/email-filtering/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: customPattern,
          patternType: newPatternType,
          fields: newPatternFields,
          legalRelevance: 'high',
          createdBy: 'user_manual'
        })
      })

      if (response.ok) {
        setCustomPattern('')
        setShowAddDialog(false)
        await loadActiveFilters()
      }
    } catch (error) {
      console.error('Failed to add custom pattern:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFilter = async (patternId: number) => {
    try {
      await fetch(`/api/email-filtering/patterns/${patternId}`, { method: 'DELETE' })
      await loadActiveFilters()
    } catch (error) {
      console.error('Failed to remove filter:', error)
    }
  }

  const suggestPatterns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/email-filtering/suggestions')
      const data = await response.json()
      if (data.success && data.data.length > 0) {
        // Add top 3 suggested patterns automatically
        const topSuggestions = data.data.slice(0, 3)
        const response2 = await fetch('/api/email-filtering/patterns/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patterns: topSuggestions.map((s: any) => ({
              pattern: s.pattern,
              patternType: s.patternType,
              fields: ['from', 'to', 'cc', 'bcc'],
              legalRelevance: 'medium',
              createdBy: 'auto_suggestion'
            }))
          })
        })
        
        if (response2.ok) {
          await loadActiveFilters()
        }
      }
    } catch (error) {
      console.error('Failed to get pattern suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderFrequencyTab = () => {
    if (!frequencyData) return <LinearProgress />

    // Use the emails array from the API response, with fallback to empty array
    const emails = frequencyData.emails || []
    const dataToShow = emails // All tabs show the same data for now

    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="frequency">Message Count</MenuItem>
              <MenuItem value="recent">Recent Activity</MenuItem>
              <MenuItem value="legal_relevance">Legal Relevance</MenuItem>
              <MenuItem value="alphabetical">Alphabetical</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            startIcon={<AutoIcon />}
            onClick={suggestPatterns}
            disabled={loading}
          >
            Auto-Suggest
          </Button>
          
          <Badge badgeContent={selectedAddresses.size} color="primary">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addSelectedAddresses}
              disabled={selectedAddresses.size === 0 || loading}
            >
              Add Selected ({selectedAddresses.size})
            </Button>
          </Badge>
        </Box>

        {dataToShow.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No email addresses found. 
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect Gmail and sync your messages to see email filtering options.
            </Typography>
          </Box>
        ) : (
          <List>
            {dataToShow.map((address) => (
              <ListItem key={address.email_address}>
                <ListItemIcon>
                  <Checkbox
                    checked={selectedAddresses.has(address.email_address)}
                    onChange={() => handleAddressToggle(address.email_address)}
                  />
                </ListItemIcon>
                <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {address.display_name || address.email_address}
                    </Typography>
                    {address.legal_importance_score > 5 && (
                      <Chip 
                        label="High Legal Relevance" 
                        size="small" 
                        color="error"
                        icon={<SecurityIcon />}
                      />
                    )}
                    {address.communication_frequency === 'daily' && (
                      <Chip 
                        label="Daily" 
                        size="small" 
                        color="success"
                        icon={<ScheduleIcon />}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {address.email_address}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {address.total_message_count} messages • 
                      {address.incoming_count} received • 
                      {address.outgoing_count} sent •
                      Last: {new Date(address.last_seen).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
          </List>
        )}
      </Box>
    )
  }

  const renderActiveFiltersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowAddDialog(true)}
        >
          Add Custom Pattern
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {activeFilters.length} active filters
        </Typography>
      </Box>

      {activeFilters.length === 0 ? (
        <Alert severity="info">
          No filters configured. All emails will be synced and displayed.
        </Alert>
      ) : (
        <List>
          {activeFilters.map((filter) => (
            <ListItem key={filter.id}>
              <ListItemIcon>
                <EmailIcon color={filter.legalRelevance === 'high' ? 'error' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {filter.pattern}
                    </Typography>
                    <Chip 
                      label={filter.patternType.toUpperCase()} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label={filter.legalRelevance} 
                      size="small"
                      color={filter.legalRelevance === 'high' ? 'error' : 'default'}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    Fields: {filter.appliesToFields.join(', ')} • 
                    Matches: {filter.matchCount}
                    {filter.estimatedMatches && ` (Est. ${filter.estimatedMatches})`}
                  </Typography>
                }
              />
              <IconButton 
                onClick={() => removeFilter(filter.id!)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )

  return (
    <Card sx={{ mt: 2, flex: '0 0 auto' }}>
      <CardContent sx={{ maxHeight: '50vh', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          Email Address Filtering
        </Typography>

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab 
            icon={<TrendingIcon />} 
            label="Most Frequent" 
            iconPosition="start"
          />
          <Tab 
            icon={<ScheduleIcon />} 
            label="Recent Activity" 
            iconPosition="start"
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="Legally Relevant" 
            iconPosition="start"
          />
          <Tab 
            icon={<FilterListIcon />} 
            label={`Active Filters (${activeFilters.length})`}
            iconPosition="start"
          />
        </Tabs>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {activeTab < 3 ? renderFrequencyTab() : renderActiveFiltersTab()}

        {/* Add Custom Pattern Dialog */}
        <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Custom Filter Pattern</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Email Pattern"
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              placeholder="john@example.com, @lawfirm.com, john.*@*.com"
              helperText="Examples: exact email, @domain.com, or wildcards with * and ?"
              sx={{ mb: 2, mt: 1 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Pattern Type</InputLabel>
              <Select
                value={newPatternType}
                label="Pattern Type"
                onChange={(e) => setNewPatternType(e.target.value as any)}
              >
                <MenuItem value="exact">Exact Email Match</MenuItem>
                <MenuItem value="domain">Domain Match (@domain.com)</MenuItem>
                <MenuItem value="wildcard">Wildcard Pattern (*)</MenuItem>
                <MenuItem value="regex">Regular Expression</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" gutterBottom>
              Apply to Email Fields:
            </Typography>
            <FormGroup row>
              {['from', 'to', 'cc', 'bcc'].map(field => (
                <FormControlLabel
                  key={field}
                  control={
                    <Checkbox
                      checked={newPatternFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewPatternFields([...newPatternFields, field])
                        } else {
                          setNewPatternFields(newPatternFields.filter(f => f !== field))
                        }
                      }}
                    />
                  }
                  label={field.toUpperCase()}
                />
              ))}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={addCustomPattern}
              variant="contained"
              disabled={!customPattern.trim() || newPatternFields.length === 0}
            >
              Add Pattern
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default EmailFilteringPanel