import React, { useState, useEffect } from 'react'
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Paper
} from '@mui/material'
import {
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material'
import { Contact } from '../types'
import { communicationsApi } from '../services/api'

interface ContactsListProps {
  onContactSelect?: (contact: Contact) => void
  selectedContactId?: number
}

const ContactsList: React.FC<ContactsListProps> = ({
  onContactSelect,
  selectedContactId
}) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContacts()
  }, [searchQuery])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await communicationsApi.getContacts(searchQuery || undefined)
      setContacts(data)
      setError(null)
    } catch (err) {
      setError('Failed to load contacts')
      console.error('Error loading contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const getContactInitials = (contact: Contact): string => {
    const name = contact.display_name || contact.name
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPriorityColor = (contact: Contact): string => {
    const priority = contact.metadata?.priority
    switch (priority) {
      case 'high': return 'var(--color-status-error)'
      case 'medium': return 'var(--color-status-warning)'
      case 'low': return 'var(--color-status-info)'
      default: return 'var(--color-text-secondary)'
    }
  }

  const formatLastCommunication = (timestamp?: string): string => {
    if (!timestamp) return 'No messages'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>Loading contacts...</Typography>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'var(--color-background-elevated)',
              borderRadius: 2
            }
          }}
        />
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {contacts.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </Typography>
          </Box>
        ) : (
          contacts.map((contact) => (
            <ListItem
              key={contact.id}
              button
              onClick={() => onContactSelect?.(contact)}
              selected={contact.id === selectedContactId}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '&.Mui-selected': {
                  backgroundColor: 'var(--color-accent-primary)20',
                  borderLeft: 3,
                  borderLeftColor: 'var(--color-accent-primary)'
                },
                '&:hover': {
                  backgroundColor: 'var(--color-background-elevated)'
                }
              }}
            >
              <Avatar
                sx={{
                  mr: 2,
                  backgroundColor: getPriorityColor(contact),
                  color: 'white',
                  width: 40,
                  height: 40
                }}
              >
                {getContactInitials(contact)}
              </Avatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {contact.display_name || contact.name}
                    </Typography>
                    {contact.metadata?.relationship && (
                      <Chip
                        label={contact.metadata.relationship}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-background-elevated)'
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {contact.primary_email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {contact.primary_email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {contact.message_count || 0} messages
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatLastCommunication(contact.last_communication)}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                {contact.primary_phone && (
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  )
}

export default ContactsList