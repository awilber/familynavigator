import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Card,
  CardContent
} from '@mui/material'
import {
  Add as AddIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  endTime?: string
  type: 'custody' | 'court' | 'medical' | 'school' | 'other'
  location: string
  participants: string[]
  description?: string
  recurring?: boolean
  color: string
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month')

  // Mock events - replace with API call
  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'Custody Exchange',
      date: '2024-01-23',
      time: '17:00',
      type: 'custody',
      location: 'Primary Residence',
      participants: ['Parent 1', 'Parent 2'],
      recurring: true,
      color: '#2196f3'
    },
    {
      id: '2',
      title: 'Court Hearing',
      date: '2024-01-25',
      time: '09:00',
      endTime: '11:00',
      type: 'court',
      location: 'County Courthouse',
      participants: ['Parent 1', 'Parent 2', 'Lawyers'],
      description: 'Review of custody arrangement',
      color: '#f44336'
    },
    {
      id: '3',
      title: 'Child Doctor Appointment',
      date: '2024-01-24',
      time: '14:30',
      type: 'medical',
      location: 'Pediatric Clinic',
      participants: ['Parent 1', 'Child'],
      color: '#4caf50'
    },
    {
      id: '4',
      title: 'Parent-Teacher Conference',
      date: '2024-01-26',
      time: '16:00',
      type: 'school',
      location: 'Elementary School',
      participants: ['Parent 1', 'Parent 2', 'Teacher'],
      color: '#ff9800'
    }
  ]

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'custody':
        return '#2196f3'
      case 'court':
        return '#f44336'
      case 'medical':
        return '#4caf50'
      case 'school':
        return '#ff9800'
      default:
        return '#9e9e9e'
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const getEventsForDate = (day: number | null) => {
    if (!day) return []
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(event => event.date === dateStr)
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Calendar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add Event
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateMonth(-1)}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>
            <IconButton onClick={() => navigateMonth(1)}>
              <ChevronRightIcon />
            </IconButton>
            <Button
              size="small"
              startIcon={<TodayIcon />}
              onClick={() => setCurrentDate(new Date())}
              sx={{ ml: 2 }}
            >
              Today
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="Custody" 
              size="small" 
              sx={{ backgroundColor: '#2196f3', color: 'white' }}
            />
            <Chip 
              label="Court" 
              size="small" 
              sx={{ backgroundColor: '#f44336', color: 'white' }}
            />
            <Chip 
              label="Medical" 
              size="small" 
              sx={{ backgroundColor: '#4caf50', color: 'white' }}
            />
            <Chip 
              label="School" 
              size="small" 
              sx={{ backgroundColor: '#ff9800', color: 'white' }}
            />
          </Box>
        </Box>

        <Grid container spacing={0}>
          {dayNames.map(day => (
            <Grid item xs key={day} sx={{ p: 1, textAlign: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {day}
              </Typography>
            </Grid>
          ))}
          {getDaysInMonth(currentDate).map((day, index) => (
            <Grid 
              item 
              xs={12/7} 
              key={index}
              sx={{ 
                minHeight: 100, 
                border: 1, 
                borderColor: 'divider',
                p: 1,
                cursor: day ? 'pointer' : 'default',
                '&:hover': day ? { backgroundColor: 'action.hover' } : {}
              }}
              onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            >
              {day && (
                <>
                  <Typography variant="body2" fontWeight="bold">
                    {day}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getEventsForDate(day).map(event => (
                      <Chip
                        key={event.id}
                        label={event.title}
                        size="small"
                        sx={{ 
                          backgroundColor: event.color, 
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                          mb: 0.5,
                          width: '100%',
                          '& .MuiChip-label': {
                            px: 0.5
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEvent(event)
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            <List>
              {events.slice(0, 5).map(event => (
                <ListItem key={event.id}>
                  <ListItemIcon>
                    <EventIcon sx={{ color: event.color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.title}
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon fontSize="small" />
                          {event.date} at {event.time}
                          {event.endTime && ` - ${event.endTime}`}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationIcon fontSize="small" />
                          {event.location}
                        </Box>
                      </Box>
                    }
                  />
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No events scheduled for today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Event</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Title"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Event Type</InputLabel>
                <Select label="Event Type">
                  <MenuItem value="custody">Custody Exchange</MenuItem>
                  <MenuItem value="court">Court Date</MenuItem>
                  <MenuItem value="medical">Medical Appointment</MenuItem>
                  <MenuItem value="school">School Event</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Participants"
                helperText="Comma-separated list"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained">Create Event</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {selectedEvent?.title}
            <Box>
              <IconButton size="small">
                <EditIcon />
              </IconButton>
              <IconButton size="small" color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={selectedEvent.type} 
                  sx={{ backgroundColor: selectedEvent.color, color: 'white' }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="action" />
                    <Typography>
                      {selectedEvent.date} at {selectedEvent.time}
                      {selectedEvent.endTime && ` - ${selectedEvent.endTime}`}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="action" />
                    <Typography>{selectedEvent.location}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon color="action" />
                    <Typography>{selectedEvent.participants.join(', ')}</Typography>
                  </Box>
                </Grid>
                {selectedEvent.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Calendar