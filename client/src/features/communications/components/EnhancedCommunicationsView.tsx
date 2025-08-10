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
  Paper,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle
} from '@mui/material'
import {
  Email as EmailIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  Timeline as TimelineIcon,
  ShowChart as ChartIcon,
  Analytics as AnalyticsIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  Sync as SyncIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import ContactsList from './ContactsList'
import CommunicationTimeline from './CommunicationTimeline'
import CommunicationTrendsChart from './CommunicationTrendsChart'
import CommunicationOverviewChart from './CommunicationOverviewChart'
import GmailIntegration from './GmailIntegration'
import EmailFilteringPanel from './EmailFilteringPanel'
import PeopleAndCommunications from './PeopleAndCommunications'
import EnhancedCommunicationAnalysis from './EnhancedCommunicationAnalysis'
import { Contact, CommunicationStats } from '../types'
import { communicationsApi } from '../services/api'


// Enhanced Stat Card with trends and insights
const EnhancedStatCard: React.FC<{
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
  subtitle?: string
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' }
  onClick?: () => void
}> = ({ title, value, icon, color = 'var(--color-accent-primary)', subtitle, trend, onClick }) => (
  <Card 
    sx={{ 
      height: '100%', 
      background: 'var(--color-background-elevated)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
      } : {}
    }}
    onClick={onClick}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        {trend && (
          <Chip
            icon={<TrendingUpIcon sx={{ 
              color: trend.direction === 'up' ? '#4caf50' : trend.direction === 'down' ? '#f44336' : '#9e9e9e',
              transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none'
            }} />}
            label={`${Math.abs(trend.value)}%`}
            size="small"
            sx={{
              backgroundColor: trend.direction === 'up' ? '#4caf5020' : trend.direction === 'down' ? '#f4433620' : '#9e9e9e20',
              color: trend.direction === 'up' ? '#4caf50' : trend.direction === 'down' ? '#f44336' : '#9e9e9e',
              fontWeight: 'bold'
            }}
          />
        )}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
)

const EnhancedCommunicationsView: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [currentFilterQuery, setCurrentFilterQuery] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [realTimeMode, setRealTimeMode] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadStats()
      }, 30000) // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await communicationsApi.getCommunicationStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const getInsightMessage = () => {
    if (!stats) return null
    
    const gmailCount = stats.by_source.find(s => s.source === 'gmail')?.count || 0
    const messagesCount = stats.by_source.find(s => s.source === 'messages')?.count || 0
    
    if (gmailCount > messagesCount * 2) {
      return {
        type: 'info' as const,
        title: 'Email Heavy Communication',
        message: 'Most of your communications are via email. Consider reviewing text message integration for a complete picture.'
      }
    } else if (messagesCount > gmailCount * 2) {
      return {
        type: 'info' as const,
        title: 'Text Heavy Communication',
        message: 'Most of your communications are via text messages. Email integration appears to be working well.'
      }
    } else if (stats.total > 10000) {
      return {
        type: 'success' as const,
        title: 'Rich Communication History',
        message: 'You have extensive communication data. Advanced analytics and pattern recognition are available.'
      }
    }
    
    return null
  }

  const insight = getInsightMessage()

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Enhanced Header with Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Communications Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Advanced communication analysis and insights
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto Refresh"
            sx={{ fontSize: '0.875rem' }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                size="small"
              />
            }
            label="Real-time"
            sx={{ fontSize: '0.875rem' }}
          />
          
          <Tooltip title="Advanced Settings">
            <IconButton onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadStats} disabled={loading}>
              <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Insight Alert */}
      {insight && (
        <Alert severity={insight.type} sx={{ mb: 2 }}>
          <AlertTitle>{insight.title}</AlertTitle>
          {insight.message}
        </Alert>
      )}

      {/* Enhanced Stats Cards */}
      {stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <EnhancedStatCard
              title="Total Communications"
              value={stats.total.toLocaleString()}
              icon={<Badge badgeContent="Live" color="success"><MessageIcon /></Badge>}
              color="var(--color-accent-primary)"
              subtitle="All sources combined"
              trend={{ value: 12, direction: 'up' }}
              onClick={() => console.log('View all communications')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <EnhancedStatCard
              title="Email Messages"
              value={stats.by_source.find(s => s.source === 'gmail')?.count.toLocaleString() || '0'}
              icon={<EmailIcon />}
              color="var(--color-status-info)"
              subtitle="Gmail integration active"
              trend={{ value: 8, direction: 'up' }}
              onClick={() => console.log('View email analysis')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <EnhancedStatCard
              title="Text Messages"
              value={stats.by_source.find(s => s.source === 'messages')?.count.toLocaleString() || '0'}
              icon={<MessageIcon />}
              color="var(--color-status-success)"
              subtitle="Messages app sync"
              trend={{ value: 5, direction: 'neutral' }}
              onClick={() => console.log('View text analysis')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <EnhancedStatCard
              title="Active Period"
              value={formatDateRange(stats)}
              icon={<ScheduleIcon />}
              color="var(--color-status-warning)"
              subtitle="Communication timespan"
              onClick={() => console.log('View timeline')}
            />
          </Grid>
        </Grid>
      )}

      {/* Enhanced Gmail Integration with Status */}
      <GmailIntegration />

      {/* Enhanced Communication Overview with Real-time Updates */}
      <Box sx={{ position: 'relative' }}>
        {realTimeMode && (
          <Chip
            icon={<VisibilityIcon />}
            label="Real-time Mode"
            color="success"
            size="small"
            sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
          />
        )}
        <CommunicationOverviewChart />
      </Box>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Paper sx={{ p: 2, backgroundColor: 'var(--color-background-elevated)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FilterIcon />
            <Typography variant="h6">Advanced Filters & Analytics</Typography>
          </Box>
          <EmailFilteringPanel 
            onFilterApply={(query) => {
              console.log('Applying advanced filter:', query)
              setCurrentFilterQuery(query)
            }}
            onFilterClear={() => {
              console.log('Clearing advanced filters')
              setCurrentFilterQuery(undefined)
            }}
            onExportResults={() => {
              console.log('Exporting advanced results')
            }}
          />
        </Paper>
      )}

      {/* Enhanced Main Content */}
      <Grid container spacing={3} sx={{ flex: '1 1 auto', minHeight: 500 }}>
        {/* Enhanced People & Communications Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon />
                <Typography variant="h6">Smart Contact Hub</Typography>
                {realTimeMode && (
                  <Badge color="success" variant="dot" sx={{ ml: 'auto' }} />
                )}
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <PeopleAndCommunications
                onContactSelect={setSelectedContact}
                onFilterApply={(query) => {
                  console.log('Applying contact filter:', query)
                  setCurrentFilterQuery(query)
                }}
                onFilterClear={() => {
                  console.log('Clearing contact filters')
                  setCurrentFilterQuery(undefined)
                }}
                selectedContactId={selectedContact?.id}
                currentFilterQuery={currentFilterQuery}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Enhanced Communication Analysis */}
        <Grid item xs={12} md={8}>
          <EnhancedCommunicationAnalysis
            selectedContact={selectedContact}
            currentFilterQuery={currentFilterQuery}
            sx={{ height: '100%' }}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

// Add spin animation
const styles = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`
document.head.appendChild(document.createElement('style')).textContent = styles

export default EnhancedCommunicationsView