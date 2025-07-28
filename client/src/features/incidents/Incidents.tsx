import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as ResolvedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon
} from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { 
  fetchIncidentsSuccess, 
  setFilter,
  Incident 
} from './incidentsSlice'

const Incidents: React.FC = () => {
  const dispatch = useDispatch()
  const { incidents, filter } = useSelector((state: RootState) => state.incidents)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    // Mock data - replace with API call
    const mockIncidents: Incident[] = [
      {
        id: '1',
        title: 'Late Pickup - 45 minutes',
        description: 'Ex-spouse arrived 45 minutes late for scheduled pickup without prior notice.',
        date: '2024-01-20',
        time: '17:45',
        location: 'Primary residence',
        type: 'violation',
        severity: 'medium',
        status: 'open',
        involvedParties: ['Ex-spouse', 'Children'],
        witnesses: [],
        evidence: {
          documents: [],
          communications: ['comm-2'],
          photos: []
        },
        notes: 'This is the third time this month.',
        createdAt: '2024-01-20T18:00:00',
        updatedAt: '2024-01-20T18:00:00'
      },
      {
        id: '2',
        title: 'Verbal Altercation at Exchange',
        description: 'Heated argument during child exchange in front of children.',
        date: '2024-01-18',
        time: '16:00',
        location: 'School parking lot',
        type: 'concern',
        severity: 'high',
        status: 'escalated',
        involvedParties: ['Ex-spouse', 'User', 'Children'],
        witnesses: ['School staff member'],
        evidence: {
          documents: ['doc-1'],
          communications: ['comm-4'],
          photos: []
        },
        notes: 'School staff witnessed the incident. Follow-up meeting scheduled.',
        createdAt: '2024-01-18T16:30:00',
        updatedAt: '2024-01-19T10:00:00'
      },
      {
        id: '3',
        title: 'Missed Medical Appointment',
        description: 'Child missed scheduled doctor appointment during ex-spouse custody time.',
        date: '2024-01-15',
        time: '10:00',
        location: 'Pediatric clinic',
        type: 'violation',
        severity: 'medium',
        status: 'resolved',
        involvedParties: ['Ex-spouse', 'Child'],
        witnesses: [],
        evidence: {
          documents: ['doc-4'],
          communications: [],
          photos: []
        },
        notes: 'Appointment rescheduled. Medical office confirmed no-show.',
        createdAt: '2024-01-15T11:00:00',
        updatedAt: '2024-01-16T09:00:00'
      }
    ]
    dispatch(fetchIncidentsSuccess(mockIncidents))
  }, [dispatch])

  const getSeverityIcon = (severity: Incident['severity']) => {
    switch (severity) {
      case 'high':
        return <ErrorIcon color="error" />
      case 'medium':
        return <WarningIcon color="warning" />
      default:
        return <InfoIcon color="info" />
    }
  }

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      default:
        return 'info'
    }
  }

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'resolved':
        return 'success'
      case 'escalated':
        return 'error'
      default:
        return 'default'
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesType = !filter.type || incident.type === filter.type
    const matchesSeverity = !filter.severity || incident.severity === filter.severity
    const matchesStatus = !filter.status || incident.status === filter.status

    return matchesType && matchesSeverity && matchesStatus
  })

  const handleViewDetail = (incident: Incident) => {
    setSelectedIncident(incident)
    setDetailOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Incidents
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Report Incident
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={filter.type || ''}
                onChange={(e) => dispatch(setFilter({ type: e.target.value || null }))}
                label="Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="violation">Violation</MenuItem>
                <MenuItem value="concern">Concern</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="communication">Communication</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filter.severity || ''}
                onChange={(e) => dispatch(setFilter({ severity: e.target.value || null }))}
                label="Severity"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filter.status || ''}
                onChange={(e) => dispatch(setFilter({ status: e.target.value || null }))}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="escalated">Escalated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => dispatch(setFilter({ type: null, severity: null, status: null }))}
              sx={{ height: '56px' }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {filteredIncidents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No incidents found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredIncidents.map((incident) => (
            <Grid item xs={12} key={incident.id}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => handleViewDetail(incident)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      bgcolor: `${getSeverityColor(incident.severity)}.light`,
                      color: `${getSeverityColor(incident.severity)}.main`
                    }}>
                      {getSeverityIcon(incident.severity)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {incident.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip 
                          label={incident.type} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          label={incident.status} 
                          size="small" 
                          color={getStatusColor(incident.status) as any}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {incident.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {incident.date} at {incident.time}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {incident.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PeopleIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {incident.involvedParties.length} involved
                        </Typography>
                      </Box>
                    </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Report New Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
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
              <TextField
                fullWidth
                label="Location"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select label="Type">
                  <MenuItem value="violation">Violation</MenuItem>
                  <MenuItem value="concern">Concern</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                  <MenuItem value="communication">Communication</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Severity</InputLabel>
                <Select label="Severity">
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select label="Status" defaultValue="open">
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="escalated">Escalated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Involved Parties"
                helperText="Comma-separated list of people involved"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Witnesses"
                helperText="Comma-separated list of witnesses"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained">Create Incident</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{selectedIncident?.title}</Typography>
            <Box>
              <IconButton>
                <EditIcon />
              </IconButton>
              <IconButton color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box>
              <Alert severity={getSeverityColor(selectedIncident.severity) as any} sx={{ mb: 2 }}>
                {selectedIncident.type.toUpperCase()} - {selectedIncident.severity.toUpperCase()} severity
              </Alert>
              
              <Typography variant="body1" paragraph>
                {selectedIncident.description}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                  <Typography>{selectedIncident.date} at {selectedIncident.time}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography>{selectedIncident.location}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={selectedIncident.status} 
                      color={getStatusColor(selectedIncident.status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography>{new Date(selectedIncident.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Involved Parties</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {selectedIncident.involvedParties.map(party => (
                      <Chip key={party} label={party} size="small" />
                    ))}
                  </Box>
                </Grid>
                {selectedIncident.witnesses.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Witnesses</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {selectedIncident.witnesses.map(witness => (
                        <Chip key={witness} label={witness} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {selectedIncident.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography>{selectedIncident.notes}</Typography>
                  </Grid>
                )}
              </Grid>
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

export default Incidents