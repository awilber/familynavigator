import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent
} from '@mui/material'
import {
  Email as EmailIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'
import ContactsList from './ContactsList'
import CommunicationTimeline from './CommunicationTimeline'
import GmailIntegration from './GmailIntegration'
import EmailFilteringPanel from './EmailFilteringPanel'
import { Contact, CommunicationStats } from '../types'
import { communicationsApi } from '../services/api'

const CommunicationsView: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [stats, setStats] = useState<CommunicationStats | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await communicationsApi.getCommunicationStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      // Loading complete
    }
  }

  const StatCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactNode
    color?: string
  }> = ({ title, value, icon, color = 'var(--color-accent-primary)' }) => (
    <Card sx={{ height: '100%', background: 'var(--color-background-elevated)' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: `${color}20`,
            color: color
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )

  const formatDateRange = (stats: CommunicationStats): string => {
    if (!stats.date_range.earliest || !stats.date_range.latest) {
      return 'No communications yet'
    }
    
    const earliest = new Date(stats.date_range.earliest).getFullYear()
    const latest = new Date(stats.date_range.latest).getFullYear()
    
    if (earliest === latest) {
      return `${earliest}`
    }
    return `${earliest} - ${latest}`
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3, gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Communications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and analyze your communication history
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Messages"
              value={stats.total.toLocaleString()}
              icon={<MessageIcon />}
              color="var(--color-accent-primary)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Gmail Messages"
              value={stats.by_source.find(s => s.source === 'gmail')?.count || 0}
              icon={<EmailIcon />}
              color="var(--color-status-info)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Text Messages"
              value={stats.by_source.find(s => s.source === 'messages')?.count || 0}
              icon={<MessageIcon />}
              color="var(--color-status-success)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Date Range"
              value={formatDateRange(stats)}
              icon={<ScheduleIcon />}
              color="var(--color-status-warning)"
            />
          </Grid>
        </Grid>
      )}

      {/* Gmail Integration */}
      <GmailIntegration />

      {/* Email Filtering Panel */}
      <EmailFilteringPanel />

      {/* Main Content */}
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Contacts List */}
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Contacts
            </Typography>
            <ContactsList
              onContactSelect={setSelectedContact}
              selectedContactId={selectedContact?.id}
            />
          </Box>
        </Grid>

        {/* Communication Timeline */}
        <Grid item xs={12} md={8}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6">
                {selectedContact ? 'Messages' : 'Recent Activity'}
              </Typography>
              {selectedContact && (
                <Chip
                  label={selectedContact.display_name || selectedContact.name}
                  color="primary"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'var(--color-accent-primary)10',
                    borderColor: 'var(--color-accent-primary)'
                  }}
                />
              )}
            </Box>
            <CommunicationTimeline
              contactId={selectedContact?.id}
              sx={{ flex: 1 }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CommunicationsView