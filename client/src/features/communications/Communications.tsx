import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider
} from '@mui/material'
import {
  Email as EmailIcon,
  Message as MessageIcon,
  Phone as PhoneIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  SentimentVerySatisfied as PositiveIcon,
  SentimentNeutral as NeutralIcon,
  SentimentVeryDissatisfied as NegativeIcon
} from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { 
  fetchCommunicationsSuccess, 
  setFilter,
  Communication 
} from './communicationsSlice'

const Communications: React.FC = () => {
  const dispatch = useDispatch()
  const { communications, filter } = useSelector((state: RootState) => state.communications)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    // Mock data - replace with API call
    const mockCommunications: Communication[] = [
      {
        id: '1',
        type: 'email',
        sender: 'ex-spouse@email.com',
        recipient: 'user@email.com',
        subject: 'Custody Schedule Change Request',
        content: 'I would like to discuss changing the pickup time for next weekend...',
        date: '2024-01-22T10:30:00',
        sentiment: 'neutral',
        tags: ['custody', 'schedule'],
        attachments: []
      },
      {
        id: '2',
        type: 'text',
        sender: 'ex-spouse',
        recipient: 'user',
        content: 'Can you pick up the kids 30 minutes early today?',
        date: '2024-01-21T15:45:00',
        sentiment: 'neutral',
        tags: ['pickup', 'schedule'],
        attachments: []
      },
      {
        id: '3',
        type: 'email',
        sender: 'lawyer@lawfirm.com',
        recipient: 'user@email.com',
        subject: 'Court Date Reminder',
        content: 'This is a reminder about your upcoming court date...',
        date: '2024-01-20T09:00:00',
        sentiment: 'neutral',
        tags: ['legal', 'court'],
        attachments: ['court_notice.pdf']
      },
      {
        id: '4',
        type: 'text',
        sender: 'ex-spouse',
        recipient: 'user',
        content: 'Why are you always late? This is unacceptable!',
        date: '2024-01-19T18:30:00',
        sentiment: 'negative',
        tags: ['conflict', 'timing'],
        attachments: []
      }
    ]
    dispatch(fetchCommunicationsSuccess(mockCommunications))
  }, [dispatch])

  const getTypeIcon = (type: Communication['type']) => {
    switch (type) {
      case 'email':
        return <EmailIcon />
      case 'text':
        return <MessageIcon />
      case 'call':
        return <PhoneIcon />
      default:
        return <ArticleIcon />
    }
  }

  const getSentimentIcon = (sentiment?: Communication['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return <PositiveIcon color="success" />
      case 'negative':
        return <NegativeIcon color="error" />
      default:
        return <NeutralIcon color="action" />
    }
  }

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = searchTerm === '' || 
      comm.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.sender.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filter.type || comm.type === filter.type
    const matchesSentiment = !filter.sentiment || comm.sentiment === filter.sentiment

    return matchesSearch && matchesType && matchesSentiment
  })

  const handleViewDetail = (comm: Communication) => {
    setSelectedComm(comm)
    setDetailOpen(true)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Communications
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search communications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={filter.type || ''}
                onChange={(e) => dispatch(setFilter({ type: e.target.value || null }))}
                label="Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="call">Call</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sentiment</InputLabel>
              <Select
                value={filter.sentiment || ''}
                onChange={(e) => dispatch(setFilter({ sentiment: e.target.value || null }))}
                label="Sentiment"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="positive">Positive</MenuItem>
                <MenuItem value="neutral">Neutral</MenuItem>
                <MenuItem value="negative">Negative</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('')
                dispatch(setFilter({ type: null, sentiment: null }))
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <List>
          {filteredCommunications.map((comm, index) => (
            <React.Fragment key={comm.id}>
              <ListItem>
                <ListItemIcon>
                  {getTypeIcon(comm.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {comm.subject || `${comm.type} from ${comm.sender}`}
                      </Typography>
                      {getSentimentIcon(comm.sentiment)}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {comm.content}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {comm.tags.map(tag => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleViewDetail(comm)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < filteredCommunications.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedComm && getTypeIcon(selectedComm.type)}
            {selectedComm?.subject || 'Communication Detail'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedComm && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">From</Typography>
                  <Typography>{selectedComm.sender}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">To</Typography>
                  <Typography>{selectedComm.recipient}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography>{new Date(selectedComm.date).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Sentiment</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getSentimentIcon(selectedComm.sentiment)}
                    <Typography>{selectedComm.sentiment || 'Not analyzed'}</Typography>
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedComm.content}
              </Typography>
              {selectedComm.attachments && selectedComm.attachments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Attachments</Typography>
                  {selectedComm.attachments.map(attachment => (
                    <Chip key={attachment} label={attachment} sx={{ mr: 1 }} />
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Communications