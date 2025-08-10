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
  ToggleButtonGroup
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
  Search as SearchIcon
} from '@mui/icons-material'
import { Contact } from '../types'
import { communicationsApi } from '../services/api'
import CompactDataSources from './CompactDataSources'

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

interface PeopleAndCommunicationsProps {
  onContactSelect?: (contact: Contact | null) => void
  onFilterApply?: (query: string) => void
  onFilterClear?: () => void
  selectedContactId?: number
  currentFilterQuery?: string
}

type ViewMode = 'contacts' | 'all-addresses'
type SortMode = 'frequency' | 'recent' | 'alphabetical' | 'legal_relevance'

const PeopleAndCommunications: React.FC<PeopleAndCommunicationsProps> = ({
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
  const [sortMode, setSortMode] = useState<SortMode>('frequency')
  const [searchTerm, setSearchTerm] = useState('')

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
        fetch(`http://localhost:7001/api/email-filtering/analysis?sortBy=${sortMode}`).then(res => res.json())
      ])

      setContacts(contactsResponse || [])
      
      if (emailsResponse.success) {
        setEmailAddresses(emailsResponse.data.emails || [])
      } else {
        setError(emailsResponse.error || 'Failed to load email addresses')
      }
    } catch (err) {
      setError('Network error loading data')
      console.error('Error loading people and communications data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredItems = () => {
    let items: Array<Contact | EmailAddress> = []

    if (viewMode === 'contacts') {
      items = contacts
    } else {
      // Show API-sorted email addresses first (to preserve sorting), 
      // then add remaining contacts
      const apiEmailSet = new Set(emailAddresses.map(e => e.email_address.toLowerCase()))
      const contactsWithoutApiEmails = contacts.filter(
        contact => !contact.primary_email || !apiEmailSet.has(contact.primary_email.toLowerCase())
      )
      
      // CRITICAL: Put API-sorted emails first to preserve sort order
      items = [...emailAddresses, ...contactsWithoutApiEmails]
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => {
        if ('name' in item) {
          // Contact
          return item.name?.toLowerCase().includes(term) ||
                 item.primary_email?.toLowerCase().includes(term)
        } else {
          // Email address
          return item.email_address.toLowerCase().includes(term) ||
                 item.display_name.toLowerCase().includes(term)
        }
      })
    }

    return items
  }

  const handleItemClick = (item: Contact | EmailAddress) => {
    if ('name' in item) {
      // This is a contact
      onContactSelect?.(item)
    } else {
      // This is an email address - apply filter
      const query = `(from:${item.email_address} OR to:${item.email_address})`
      onFilterApply?.(query)
      onContactSelect?.(null) // Clear contact selection when filtering by email
    }
  }

  const handleCreateContact = (emailAddress: string) => {
    // TODO: Implement contact creation modal
    console.log('Create contact for:', emailAddress)
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

  const isSelected = (item: Contact | EmailAddress) => {
    if ('name' in item) {
      return selectedContactId === item.id
    } else {
      return currentFilterQuery?.includes(item.email_address)
    }
  }

  const renderContactItem = (contact: Contact) => (
    <Box
      key={`contact-${contact.id}`}
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
          transform: 'translateY(-1px)'
        }
      }}
    >
      <Avatar sx={{ mr: 1.5, width: 32, height: 32, bgcolor: 'primary.main' }}>
        <PersonIcon fontSize="small" />
      </Avatar>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.25, lineHeight: 1.2 }}>
          {contact.display_name || contact.name}
        </Typography>
        
        {contact.primary_email && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: 'block' }}>
            <EmailIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            {contact.primary_email}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" label="Contact" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          {contact.relationship_type && (
            <Chip size="small" label={contact.relationship_type} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </Box>
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
          sx={{ minHeight: 24, py: 0.25, px: 1, fontSize: '0.75rem' }}
        >
          Filter
        </Button>
        <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ p: 0.25 }}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )

  const renderEmailItem = (email: EmailAddress) => (
    <Box
      key={`email-${email.email_address}`}
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
          transform: 'translateY(-1px)'
        }
      }}
    >
      <Avatar sx={{ mr: 1.5, width: 32, height: 32, bgcolor: 'info.main' }}>
        <EmailIcon fontSize="small" />
      </Avatar>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.25, lineHeight: 1.2 }}>
          {email.display_name}
        </Typography>
        
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: 'block' }}>
          {email.email_address}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip 
            size="small" 
            label={`${email.total_message_count} msgs`}
            color={getFrequencyColor(email.communication_frequency) as any}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <Chip 
            size="small" 
            label={`Legal: ${email.legal_importance_score}/10`}
            color="warning"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {formatLastSeen(email.last_seen)}
          </Typography>
        </Box>
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
          sx={{ minHeight: 24, py: 0.25, px: 1, fontSize: '0.75rem' }}
        >
          Filter
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.stopPropagation()
            handleCreateContact(email.email_address)
          }}
          sx={{ minHeight: 24, py: 0.25, px: 1, fontSize: '0.7rem' }}
        >
          Contact
        </Button>
      </Box>
    </Box>
  )

  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: 400 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading people and communications...</Typography>
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

  return (
    <Card sx={{ height: '100%', minHeight: 400 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.2rem' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              People & Communications
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {filteredItems.length} {viewMode === 'contacts' ? 'contacts' : 'items'}
            </Typography>
          </Box>
          
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

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search people and addresses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1rem' }} />
          }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-input': { py: 1 } }}
        />

        {/* Compact Data Sources */}
        <Box sx={{ mb: 1.5 }}>
          <CompactDataSources />
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}
          >
            <ToggleButton value="all-addresses">
              <EmailIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              All Addresses
            </ToggleButton>
            <ToggleButton value="contacts">
              <PersonIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Contacts Only
            </ToggleButton>
          </ToggleButtonGroup>

          <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { py: 0.5, px: 1, fontSize: '0.75rem', minHeight: 28 } }}>
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

        <Divider sx={{ mb: 1.5 }} />

        {/* Items List */}
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
              <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">No Items Found</Typography>
              <Typography variant="body2" textAlign="center">
                {searchTerm 
                  ? `No results for "${searchTerm}"`
                  : 'No contacts or email addresses available'
                }
              </Typography>
            </Box>
          ) : (
            filteredItems.map(item => 
              'name' in item ? renderContactItem(item) : renderEmailItem(item)
            )
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default PeopleAndCommunications