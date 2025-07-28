import React from 'react'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material'
import {
  Email as EmailIcon,
  Description as DocumentIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

interface StatCard {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  link: string
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const stats: StatCard[] = [
    {
      title: 'Communications',
      value: 156,
      icon: <EmailIcon />,
      color: '#2196f3',
      link: '/communications'
    },
    {
      title: 'Documents',
      value: 42,
      icon: <DocumentIcon />,
      color: '#4caf50',
      link: '/documents'
    },
    {
      title: 'Active Incidents',
      value: 8,
      icon: <WarningIcon />,
      color: '#ff9800',
      link: '/incidents'
    },
    {
      title: 'Upcoming Events',
      value: 5,
      icon: <CalendarIcon />,
      color: '#9c27b0',
      link: '/calendar'
    }
  ]

  const recentActivities = [
    { 
      type: 'email', 
      description: 'New email from ex-spouse regarding custody schedule',
      time: '2 hours ago',
      priority: 'high'
    },
    { 
      type: 'document', 
      description: 'Court document uploaded: Custody Agreement Amendment',
      time: '5 hours ago',
      priority: 'medium'
    },
    { 
      type: 'incident', 
      description: 'Late pickup documented',
      time: '1 day ago',
      priority: 'low'
    },
    { 
      type: 'calendar', 
      description: 'Mediation session scheduled for next week',
      time: '2 days ago',
      priority: 'high'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <EmailIcon />
      case 'document':
        return <AttachFileIcon />
      case 'incident':
        return <WarningIcon />
      case 'calendar':
        return <CalendarIcon />
      default:
        return <TrendingIcon />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Welcome back! Here's your family navigation overview.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
              onClick={() => navigate(stat.link)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      backgroundColor: stat.color, 
                      borderRadius: 1, 
                      p: 1, 
                      display: 'flex',
                      mr: 2
                    }}
                  >
                    {React.cloneElement(stat.icon as React.ReactElement, { 
                      sx: { color: 'white' } 
                    })}
                  </Box>
                  <Typography variant="h4" component="div">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentActivities.map((activity, index) => (
                <ListItem key={index} divider={index < recentActivities.length - 1}>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={activity.time}
                  />
                  <Chip 
                    label={activity.priority} 
                    size="small" 
                    color={getPriorityColor(activity.priority) as any}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                startIcon={<EmailIcon />}
                onClick={() => navigate('/communications')}
              >
                Check Messages
              </Button>
              <Button 
                variant="outlined" 
                fullWidth
                startIcon={<DocumentIcon />}
                onClick={() => navigate('/documents')}
              >
                Upload Document
              </Button>
              <Button 
                variant="outlined" 
                fullWidth
                startIcon={<WarningIcon />}
                onClick={() => navigate('/incidents')}
              >
                Report Incident
              </Button>
              <Button 
                variant="outlined" 
                fullWidth
                startIcon={<CalendarIcon />}
                onClick={() => navigate('/calendar')}
              >
                View Calendar
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard