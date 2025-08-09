import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper
} from '@mui/material'
import {
  Email as EmailIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  Timeline as TimelineIcon,
  ShowChart as ChartIcon
} from '@mui/icons-material'
import ContactsList from './ContactsList'
import CommunicationTimeline from './CommunicationTimeline'
import CommunicationTrendsChart from './CommunicationTrendsChart'
import CommunicationOverviewChart from './CommunicationOverviewChart'
import GmailIntegration from './GmailIntegration'
import EmailFilteringPanel from './EmailFilteringPanel'
import PeopleAndCommunications from './PeopleAndCommunications'
import { Contact, CommunicationStats } from '../types'
import { communicationsApi } from '../services/api'

// TabPanel component for Material-UI tabs
interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`communication-tabpanel-${index}`}
      aria-labelledby={`communication-tab-${index}`}
      style={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
      {...other}
    >
      {value === index && children}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `communication-tab-${index}`,
    'aria-controls': `communication-tabpanel-${index}`,
  }
}

const CommunicationsView: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [currentFilterQuery, setCurrentFilterQuery] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState(0)

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
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

      {/* Communication Overview Chart */}
      <CommunicationOverviewChart />

      {/* Email Filtering Panel - REPLACED WITH UNIFIED PANEL
      <EmailFilteringPanel 
        onFilterApply={(query) => {
          console.log('Applying filter:', query)
          setCurrentFilterQuery(query)
        }}
        onFilterClear={() => {
          console.log('Clearing filters')
          setCurrentFilterQuery(undefined)
        }}
        onExportResults={() => {
          console.log('Exporting results')
          // TODO: Implement export functionality
        }}
      />
      */}

      {/* Main Content */}
      <Grid container spacing={3} sx={{ flex: '1 1 auto', minHeight: 400 }}>
        {/* Unified People & Communications Panel */}
        <Grid item xs={12} md={4}>
          <PeopleAndCommunications
            onContactSelect={setSelectedContact}
            onFilterApply={(query) => {
              console.log('Applying filter:', query)
              setCurrentFilterQuery(query)
            }}
            onFilterClear={() => {
              console.log('Clearing filters')
              setCurrentFilterQuery(undefined)
            }}
            selectedContactId={selectedContact?.id}
            currentFilterQuery={currentFilterQuery}
          />
        </Grid>

        {/* Communication Analysis */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with status chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, pb: 0 }}>
              <Typography variant="h6">
                Communication Analysis
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
              {currentFilterQuery && (
                <Chip
                  label={`Filtered: ${currentFilterQuery.substring(0, 30)}...`}
                  color="warning"
                  variant="outlined"
                  sx={{
                    backgroundColor: 'orange',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={(event, newValue) => setActiveTab(newValue)}
                aria-label="communication analysis tabs"
              >
                <Tab 
                  icon={<TimelineIcon />}
                  label="Recent Activity" 
                  {...a11yProps(0)}
                  sx={{ minHeight: 48 }}
                />
                <Tab 
                  icon={<ChartIcon />}
                  label="Communication Trends" 
                  {...a11yProps(1)}
                  sx={{ minHeight: 48 }}
                />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TabPanel value={activeTab} index={0}>
                <CommunicationTimeline
                  contactId={selectedContact?.id}
                  filterQuery={currentFilterQuery}
                  sx={{ flex: 1 }}
                />
              </TabPanel>
              
              <TabPanel value={activeTab} index={1}>
                <CommunicationTrendsChart
                  contactId={selectedContact?.id}
                  filterQuery={currentFilterQuery}
                  sx={{ flex: 1 }}
                />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CommunicationsView