import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Checkbox,
  Stack,
  AvatarGroup
} from '@mui/material'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  AccessTime as TimeIcon,
  Gavel as LegalIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Group as GroupIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { Contact } from '../types'
import { communicationsApi } from '../services/api'

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

interface ContactInsight {
  type: 'trend' | 'pattern' | 'legal' | 'frequency'
  title: string
  description: string
  severity: 'info' | 'warning' | 'error' | 'success'
  value?: number | string
}

interface EnhancedPeopleAndCommunicationsProps {
  onContactSelect?: (contact: Contact | null) => void
  onFilterApply?: (query: string) => void
  onFilterClear?: () => void
  selectedContactId?: number
  currentFilterQuery?: string
}

type ViewMode = 'contacts' | 'all-addresses' | 'insights' | 'groups'
type SortMode = 'frequency' | 'recent' | 'alphabetical' | 'legal_relevance' | 'ai_priority'
type GroupMode = 'domain' | 'frequency' | 'relationship' | 'legal_relevance'

const EnhancedPeopleAndCommunications: React.FC<EnhancedPeopleAndCommunicationsProps> = ({
  onContactSelect,
  onFilterApply,
  onFilterClear,
  selectedContactId,
  currentFilterQuery
}) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('all-addresses')
  const [sortMode, setSortMode] = useState<SortMode>('ai_priority')
  const [groupMode, setGroupMode] = useState<GroupMode>('legal_relevance')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['high-priority']))

  useEffect(() => {
    loadData()
  }, [sortMode])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load both contacts and email addresses in parallel
      const [contactsResponse, emailsResponse] = await Promise.all([
        communicationsApi.getContacts(),
        fetch(`http://localhost:7001/api/email-filtering/analysis?sortBy=${sortMode === 'ai_priority' ? 'frequency' : sortMode}`).then(res => res.json())
      ])

      setContacts(contactsResponse || [])
      
      if (emailsResponse.success) {
        setEmailAddresses(emailsResponse.data.emails || [])
      } else {
        setError(emailsResponse.error || 'Failed to load email addresses')
      }
    } catch (err) {
      setError('Network error loading data')
      console.error('Error loading enhanced people and communications data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getContactInsights = (item: Contact | EmailAddress): ContactInsight[] => {
    const insights: ContactInsight[] = []

    if ('total_message_count' in item) {
      // Email address insights
      if (item.legal_importance_score >= 8) {
        insights.push({
          type: 'legal',
          title: 'High Legal Relevance',
          description: 'This contact has high legal significance',
          severity: 'warning',
          value: item.legal_importance_score
        })
      }

      if (item.communication_frequency === 'daily') {
        insights.push({
          type: 'frequency',
          title: 'Frequent Communication',
          description: 'Daily communication pattern detected',
          severity: 'info'
        })
      }

      const daysSinceLastSeen = Math.floor((new Date().getTime() - new Date(item.last_seen).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastSeen > 30 && item.communication_frequency === 'daily') {
        insights.push({
          type: 'pattern',
          title: 'Communication Gap',
          description: 'Unusual gap in regular communication',
          severity: 'warning'
        })
      }

      if (item.total_message_count > 100) {
        insights.push({
          type: 'trend',
          title: 'High Volume Contact',
          description: `${item.total_message_count} messages exchanged`,
          severity: 'info',
          value: item.total_message_count
        })
      }
    }

    return insights
  }

  const getAIPriorityScore = (item: Contact | EmailAddress): number => {
    let score = 0

    if ('total_message_count' in item) {
      // Email address scoring
      score += item.legal_importance_score * 10
      score += Math.min(item.total_message_count / 10, 50)
      
      const daysSinceLastSeen = Math.floor((new Date().getTime() - new Date(item.last_seen).getTime()) / (1000 * 60 * 60 * 24))
      score += Math.max(0, 30 - daysSinceLastSeen)
      
      if (item.communication_frequency === 'daily') score += 20
      else if (item.communication_frequency === 'weekly') score += 10
      else if (item.communication_frequency === 'monthly') score += 5
    } else {
      // Contact scoring
      score += 50 // Base score for having a structured contact
      if (item.relationship_type === 'legal') score += 30
      if (item.relationship_type === 'family') score += 20
    }

    return Math.round(score)
  }

  const getFilteredItems = () => {
    let items: Array<Contact | EmailAddress> = []

    if (viewMode === 'contacts') {
      items = contacts
    } else if (viewMode === 'all-addresses') {
      // Enhanced sorting with AI priority
      if (sortMode === 'ai_priority') {
        const apiEmailSet = new Set(emailAddresses.map(e => e.email_address.toLowerCase()))
        const contactsWithoutApiEmails = contacts.filter(
          contact => !contact.primary_email || !apiEmailSet.has(contact.primary_email.toLowerCase())
        )
        
        const allItems = [...emailAddresses, ...contactsWithoutApiEmails]
        items = allItems.sort((a, b) => getAIPriorityScore(b) - getAIPriorityScore(a))
      } else {
        // Original sorting logic
        const apiEmailSet = new Set(emailAddresses.map(e => e.email_address.toLowerCase()))
        const contactsWithoutApiEmails = contacts.filter(
          contact => !contact.primary_email || !apiEmailSet.has(contact.primary_email.toLowerCase())
        )
        items = [...emailAddresses, ...contactsWithoutApiEmails]
      }
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => {
        if ('name' in item) {
          return item.name?.toLowerCase().includes(term) ||
                 item.primary_email?.toLowerCase().includes(term)
        } else {
          return item.email_address.toLowerCase().includes(term) ||
                 item.display_name.toLowerCase().includes(term)
        }
      })
    }

    return items
  }

  const getGroupedItems = () => {
    const items = getFilteredItems()
    const groups: { [key: string]: Array<Contact | EmailAddress> } = {}

    items.forEach(item => {
      let groupKey = 'Unknown'

      switch (groupMode) {
        case 'domain':
          if ('email_address' in item) {
            groupKey = item.domain || item.email_address.split('@')[1] || 'Unknown'
          } else {
            groupKey = item.primary_email?.split('@')[1] || 'Contacts'
          }
          break
        case 'frequency':
          if ('communication_frequency' in item) {
            groupKey = item.communication_frequency || 'Unknown'
          } else {
            groupKey = 'Contacts'
          }
          break
        case 'relationship':
          if ('relationship_type' in item) {
            groupKey = item.relationship_type || 'Unknown'
          } else {
            groupKey = 'Email Addresses'
          }
          break
        case 'legal_relevance':
          if ('legal_importance_score' in item) {
            if (item.legal_importance_score >= 8) groupKey = 'High Legal Priority'
            else if (item.legal_importance_score >= 5) groupKey = 'Medium Legal Priority'
            else groupKey = 'Low Legal Priority'
          } else {
            groupKey = 'Contacts'
          }
          break
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    return groups
  }

  const handleItemClick = (item: Contact | EmailAddress) => {
    if ('name' in item) {
      onContactSelect?.(item)
    } else {
      const query = `(from:${item.email_address} OR to:${item.email_address})`
      onFilterApply?.(query)
      onContactSelect?.(null)
    }
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} for`, Array.from(selectedItems))
    setBulkMenuAnchor(null)
    setSelectedItems(new Set())
  }

  const isSelected = (item: Contact | EmailAddress) => {
    if ('name' in item) {
      return selectedContactId === item.id
    } else {
      return currentFilterQuery?.includes(item.email_address)
    }
  }

  const getItemId = (item: Contact | EmailAddress): string => {
    return 'name' in item ? `contact-${item.id}` : `email-${item.email_address}`
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

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'success'
      case 'weekly': return 'warning'
      case 'monthly': return 'info'
      case 'rarely': return 'default'
      default: return 'default'
    }
  }

  const renderEnhancedContactItem = (contact: Contact) => {
    const insights = getContactInsights(contact)
    const priorityScore = getAIPriorityScore(contact)
    const itemId = getItemId(contact)

    return (
      <Box
        key={itemId}
        onClick={() => handleItemClick(contact)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          mb: 0.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: isSelected(contact) ? 'primary.main' : 'divider',
          backgroundColor: isSelected(contact) ? 'primary.light' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.light',
            transform: 'translateY(-1px)',
            boxShadow: 2
          }
        }}
      >
        <Checkbox
          checked={selectedItems.has(itemId)}
          onChange={(e) => {
            e.stopPropagation()
            const newSelected = new Set(selectedItems)
            if (e.target.checked) {
              newSelected.add(itemId)
            } else {
              newSelected.delete(itemId)
            }
            setSelectedItems(newSelected)
          }}
          sx={{ mr: 1 }}
        />

        <Badge
          badgeContent={priorityScore > 70 ? <StarIcon fontSize="small" /> : null}
          color="warning"
          sx={{ mr: 1.5 }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
            <PersonIcon fontSize="small" />
          </Avatar>
        </Badge>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {contact.display_name || contact.name}
            </Typography>
            {priorityScore > 70 && (
              <Chip size="small" label="High Priority" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
          
          {contact.primary_email && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: 'block' }}>
              <EmailIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
              {contact.primary_email}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Chip size="small" label="Contact" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
            {contact.relationship_type && (
              <Chip size="small" label={contact.relationship_type} variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
            <Chip size="small" label={`Score: ${priorityScore}`} color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
          </Box>

          {insights.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
              {insights.slice(0, 2).map((insight, idx) => (
                <Tooltip key={idx} title={insight.description}>
                  <Chip
                    size="small"
                    label={insight.title}
                    color={insight.severity}
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                  />
                </Tooltip>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={(e) => {
              e.stopPropagation()
              if (contact.primary_email) {
                const query = `(from:${contact.primary_email} OR to:${contact.primary_email})`
                onFilterApply?.(query)
              }
            }}
            sx={{ minHeight: 24, py: 0.25, px: 1, fontSize: '0.7rem' }}
          >
            Filter
          </Button>
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ p: 0.25 }}>
              <HistoryIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ p: 0.25 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    )
  }

  const renderEnhancedEmailItem = (email: EmailAddress) => {
    const insights = getContactInsights(email)
    const priorityScore = getAIPriorityScore(email)
    const itemId = getItemId(email)
    const trend = email.incoming_count > email.outgoing_count ? 'incoming' : 'outgoing'

    return (
      <Box
        key={itemId}
        onClick={() => handleItemClick(email)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          mb: 0.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: isSelected(email) ? 'primary.main' : 'divider',
          backgroundColor: isSelected(email) ? 'primary.light' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.light',
            transform: 'translateY(-1px)',
            boxShadow: 2
          }
        }}
      >
        <Checkbox
          checked={selectedItems.has(itemId)}
          onChange={(e) => {
            e.stopPropagation()
            const newSelected = new Set(selectedItems)
            if (e.target.checked) {
              newSelected.add(itemId)
            } else {
              newSelected.delete(itemId)
            }
            setSelectedItems(newSelected)
          }}
          sx={{ mr: 1 }}
        />

        <Badge
          badgeContent={priorityScore > 70 ? <StarIcon fontSize="small" /> : null}
          color="warning"
          sx={{ mr: 1.5 }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'info.main' }}>
            <EmailIcon fontSize="small" />
          </Avatar>
        </Badge>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {email.display_name}
            </Typography>
            {trend === 'incoming' ? (
              <TrendingDownIcon color="primary" sx={{ fontSize: 16 }} />
            ) : (
              <TrendingUpIcon color="secondary" sx={{ fontSize: 16 }} />
            )}
            {priorityScore > 70 && (
              <Chip size="small" label="Priority" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: 'block' }}>
            {email.email_address}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Chip 
              size="small" 
              label={`${email.total_message_count} msgs`}
              color={getFrequencyColor(email.communication_frequency) as any}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Chip 
              size="small" 
              label={`Legal: ${email.legal_importance_score}/10`}
              color="warning"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Chip 
              size="small" 
              label={`AI: ${priorityScore}`}
              color="info"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {formatLastSeen(email.last_seen)}
            </Typography>
          </Box>

          {/* Communication balance bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 20 }}>
              In: {email.incoming_count}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(email.incoming_count / email.total_message_count) * 100}
              sx={{ flex: 1, height: 4, borderRadius: 2 }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 20 }}>
              Out: {email.outgoing_count}
            </Typography>
          </Box>

          {insights.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
              {insights.slice(0, 2).map((insight, idx) => (
                <Tooltip key={idx} title={insight.description}>
                  <Chip
                    size="small"
                    label={insight.title}
                    color={insight.severity}
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                  />
                </Tooltip>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<FilterIcon />}
            onClick={(e) => {
              e.stopPropagation()
              handleItemClick(email)
            }}
            sx={{ minHeight: 24, py: 0.25, px: 1, fontSize: '0.7rem' }}
          >
            Filter
          </Button>
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation()
                console.log('Create contact for:', email.email_address)
              }}
              sx={{ minHeight: 20, py: 0.1, px: 0.75, fontSize: '0.6rem' }}
            >
              Contact
            </Button>
            <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ p: 0.25 }}>
              <InsightsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    )
  }

  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: 400 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading enhanced people and communications...</Typography>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ height: '100%', minHeight: 400 }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  const filteredItems = getFilteredItems()
  const groupedItems = viewMode === 'groups' ? getGroupedItems() : null
  const hasSelection = selectedItems.size > 0

  return (
    <Card sx={{ height: '100%', minHeight: 400 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1.5 }}>
        {/* Enhanced Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Badge badgeContent="AI" color="success">
              <GroupIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.3rem' }} />
            </Badge>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 0.5 }}>
              Smart Contact Hub
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {filteredItems.length} {viewMode === 'contacts' ? 'contacts' : 'items'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasSelection && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={`${selectedItems.size} selected`}
                  color="primary"
                  size="small"
                  onDelete={() => setSelectedItems(new Set())}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                  endIcon={<MoreVertIcon />}
                  sx={{ minHeight: 28 }}
                >
                  Actions
                </Button>
              </Box>
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={showInsights}
                  onChange={(e) => setShowInsights(e.target.checked)}
                  size="small"
                />
              }
              label="Insights"
              sx={{ fontSize: '0.8rem' }}
            />
            
            {currentFilterQuery && (
              <Tooltip title="Clear all filters">
                <IconButton 
                  size="small" 
                  onClick={() => {
                    onFilterClear?.()
                    onContactSelect?.(null)
                  }}
                  sx={{ color: 'warning.main', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Enhanced Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search with AI-powered suggestions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1rem' }} />,
            endAdornment: showAdvancedFilters && (
              <IconButton size="small" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            )
          }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-input': { py: 0.75 } }}
        />

        {/* Enhanced Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}
          >
            <ToggleButton value="all-addresses">
              <EmailIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Smart View
            </ToggleButton>
            <ToggleButton value="contacts">
              <PersonIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Contacts
            </ToggleButton>
            <ToggleButton value="groups">
              <GroupIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Groups
            </ToggleButton>
            <ToggleButton value="insights">
              <InsightsIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Insights
            </ToggleButton>
          </ToggleButtonGroup>

          <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { py: 0.5, px: 1, fontSize: '0.7rem', minHeight: 28 } }}>
            <Button
              onClick={() => setSortMode('ai_priority')}
              variant={sortMode === 'ai_priority' ? 'contained' : 'outlined'}
              startIcon={<AnalyticsIcon fontSize="small" />}
            >
              AI Priority
            </Button>
            <Button
              onClick={() => setSortMode('frequency')}
              variant={sortMode === 'frequency' ? 'contained' : 'outlined'}
              startIcon={<SortIcon fontSize="small" />}
            >
              Frequency
            </Button>
            <Button
              onClick={() => setSortMode('recent')}
              variant={sortMode === 'recent' ? 'contained' : 'outlined'}
              startIcon={<TimeIcon fontSize="small" />}
            >
              Recent
            </Button>
            <Button
              onClick={() => setSortMode('legal_relevance')}
              variant={sortMode === 'legal_relevance' ? 'contained' : 'outlined'}
              startIcon={<LegalIcon fontSize="small" />}
            >
              Legal
            </Button>
          </ButtonGroup>
        </Box>

        {viewMode === 'groups' && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Group by:
            </Typography>
            <ButtonGroup size="small">
              {['domain', 'frequency', 'relationship', 'legal_relevance'].map((mode) => (
                <Button
                  key={mode}
                  onClick={() => setGroupMode(mode as GroupMode)}
                  variant={groupMode === mode ? 'contained' : 'outlined'}
                  sx={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                >
                  {mode.replace('_', ' ')}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* Enhanced Items List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filteredItems.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: 200,
              color: 'text.secondary'
            }}>
              <InsightsIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">No Items Found</Typography>
              <Typography variant="body2" textAlign="center">
                {searchTerm 
                  ? `No results for "${searchTerm}"`
                  : 'No contacts or email addresses available'
                }
              </Typography>
            </Box>
          ) : viewMode === 'groups' && groupedItems ? (
            // Grouped view
            Object.entries(groupedItems).map(([groupName, items]) => (
              <Accordion
                key={groupName}
                expanded={expandedGroups.has(groupName)}
                onChange={() => {
                  const newExpanded = new Set(expandedGroups)
                  if (expandedGroups.has(groupName)) {
                    newExpanded.delete(groupName)
                  } else {
                    newExpanded.add(groupName)
                  }
                  setExpandedGroups(newExpanded)
                }}
                sx={{ mb: 1, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {groupName}
                    </Typography>
                    <Chip size="small" label={items.length} color="primary" />
                    {items.some(item => getAIPriorityScore(item) > 70) && (
                      <StarIcon color="warning" sx={{ fontSize: 16 }} />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {items.map(item => 
                    'name' in item ? renderEnhancedContactItem(item) : renderEnhancedEmailItem(item)
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            // Regular list view
            filteredItems.map(item => 
              'name' in item ? renderEnhancedContactItem(item) : renderEnhancedEmailItem(item)
            )
          )}
        </Box>

        {/* Bulk Actions Menu */}
        <Menu
          anchorEl={bulkMenuAnchor}
          open={Boolean(bulkMenuAnchor)}
          onClose={() => setBulkMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleBulkAction('create_group')}>
            <GroupIcon sx={{ mr: 1 }} /> Create Group
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('export')}>
            <PersonIcon sx={{ mr: 1 }} /> Export Selected
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('merge')}>
            <PersonIcon sx={{ mr: 1 }} /> Merge Contacts
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('tag')}>
            <PersonIcon sx={{ mr: 1 }} /> Add Tags
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  )
}

export default EnhancedPeopleAndCommunications