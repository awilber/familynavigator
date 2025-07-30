import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material'
import {
  Email as EmailIcon,
  Message as MessageIcon,
  CallReceived as IncomingIcon,
  CallMade as OutgoingIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material'
import { Communication, SearchFilters } from '../types'
import { communicationsApi } from '../services/api'

interface CommunicationTimelineProps {
  contactId?: number
  sx?: any
}

const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({
  contactId,
  sx
}) => {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    loadCommunications(true)
  }, [contactId, searchQuery])

  const loadCommunications = async (reset = false) => {
    try {
      setLoading(reset)
      const offset = reset ? 0 : communications.length

      const filters: SearchFilters = {}
      if (contactId) filters.contact_id = contactId
      if (searchQuery) filters.search_text = searchQuery

      const { communications: newComms, hasMore: more } = await communicationsApi.getCommunications(
        filters,
        50,
        offset
      )

      if (reset) {
        setCommunications(newComms)
      } else {
        setCommunications(prev => [...prev, ...newComms])
      }
      
      setHasMore(more)
      setError(null)
    } catch (err) {
      setError('Failed to load communications')
      console.error('Error loading communications:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      loadCommunications(false)
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gmail': return <EmailIcon fontSize="small" />
      case 'messages': return <MessageIcon fontSize="small" />
      default: return <MessageIcon fontSize="small" />
    }
  }

  const getDirectionIcon = (direction: string) => {
    return direction === 'incoming' 
      ? <IncomingIcon fontSize="small" sx={{ color: 'var(--color-status-info)' }} />
      : <OutgoingIcon fontSize="small" sx={{ color: 'var(--color-status-success)' }} />
  }

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'group': return <GroupIcon fontSize="small" />
      case 'third_party': return <PersonIcon fontSize="small" />
      default: return null
    }
  }

  const truncateContent = (content: string | undefined, maxLength = 150): string => {
    if (!content) return 'No content'
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <Paper sx={{ ...sx, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper sx={{ ...sx, p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ ...sx, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          placeholder="Search messages..."
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

      {/* Communications List */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {communications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {contactId ? 'No messages with this contact' : 'No communications found'}
            </Typography>
          </Box>
        ) : (
          communications.map((comm) => (
            <ListItem
              key={comm.id}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                alignItems: 'flex-start',
                py: 2,
                '&:hover': {
                  backgroundColor: 'var(--color-background-elevated)'
                }
              }}
            >
              <Avatar
                sx={{
                  mr: 2,
                  mt: 0.5,
                  backgroundColor: comm.direction === 'incoming' 
                    ? 'var(--color-status-info)20' 
                    : 'var(--color-status-success)20',
                  color: comm.direction === 'incoming' 
                    ? 'var(--color-status-info)' 
                    : 'var(--color-status-success)',
                  width: 40,
                  height: 40
                }}
              >
                {getSourceIcon(comm.source)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="medium">
                    {comm.contact_name || comm.contact_display_name || 'Unknown Contact'}
                  </Typography>
                  
                  {getDirectionIcon(comm.direction)}
                  
                  <Chip
                    label={comm.source}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: 'var(--color-background-elevated)'
                    }}
                  />
                  
                  {getMessageTypeIcon(comm.message_type) && (
                    <Box sx={{ color: 'text.secondary' }}>
                      {getMessageTypeIcon(comm.message_type)}
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatTimestamp(comm.timestamp)}
                  </Typography>
                </Box>

                {/* Subject */}
                {comm.subject && (
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mb: 0.5, color: 'text.primary' }}
                  >
                    {comm.subject}
                  </Typography>
                )}

                {/* Content */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    wordBreak: 'break-word',
                    lineHeight: 1.4
                  }}
                >
                  {truncateContent(comm.content)}
                </Typography>

                {/* Metadata */}
                {comm.third_party_source && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={`via ${comm.third_party_source}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        borderColor: 'var(--color-border-default)'
                      }}
                    />
                  </Box>
                )}
              </Box>

              <IconButton size="small" sx={{ color: 'text.secondary', ml: 1 }}>
                <MoreIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {loadingMore ? (
              <CircularProgress size={24} />
            ) : (
              <Typography
                component="button"
                onClick={loadMore}
                sx={{
                  color: 'var(--color-accent-primary)',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: 'var(--color-accent-hover)'
                  }
                }}
              >
                Load more messages
              </Typography>
            )}
          </Box>
        )}
      </List>
    </Paper>
  )
}

export default CommunicationTimeline