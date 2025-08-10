import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tabs,
  Tab,
  Badge,
  Button,
  IconButton,
  Divider,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  ButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material'
import {
  Timeline as TimelineIcon,
  TrendingUp as ChartIcon,
  Psychology as AIIcon,
  Insights as InsightsIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Lightbulb as IdeaIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Remove as NeutralIcon,
  Schedule as ScheduleIcon,
  Gavel as LegalIcon,
  Group as GroupIcon,
  Star as StarIcon,
  Language as PatternIcon
} from '@mui/icons-material'
import { Contact } from '../types'
import CommunicationTimeline from './CommunicationTimeline'
import CommunicationTrendsChart from './CommunicationTrendsChart'

interface EnhancedCommunicationAnalysisProps {
  selectedContact?: Contact | null
  currentFilterQuery?: string
  sx?: any
}

interface AnalysisInsight {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  category: 'pattern' | 'frequency' | 'sentiment' | 'legal' | 'timing'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  timestamp: string
}

interface SmartFilter {
  id: string
  name: string
  description: string
  query: string
  active: boolean
  count?: number
}

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
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `analysis-tab-${index}`,
    'aria-controls': `analysis-tabpanel-${index}`,
  }
}

const EnhancedCommunicationAnalysis: React.FC<EnhancedCommunicationAnalysisProps> = ({
  selectedContact,
  currentFilterQuery,
  sx
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [insights, setInsights] = useState<AnalysisInsight[]>([])
  const [smartFilters, setSmartFilters] = useState<SmartFilter[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showAdvancedInsights, setShowAdvancedInsights] = useState(true)
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null)
  const [expandedInsightCategory, setExpandedInsightCategory] = useState<string>('pattern')

  useEffect(() => {
    generateInsights()
    generateSmartFilters()
  }, [selectedContact, currentFilterQuery])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        generateInsights()
        generateSmartFilters()
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedContact, currentFilterQuery])

  const generateInsights = async () => {
    setLoading(true)
    // Simulate AI-powered insight generation
    const mockInsights: AnalysisInsight[] = [
      {
        id: '1',
        type: 'warning',
        category: 'pattern',
        title: 'Communication Gap Detected',
        description: 'Unusual 5-day silence period identified - previous average response time was 2 hours',
        confidence: 85,
        impact: 'high',
        actionable: true,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'info',
        category: 'frequency',
        title: 'Increased Communication Volume',
        description: '40% increase in message frequency over the past 2 weeks',
        confidence: 92,
        impact: 'medium',
        actionable: false,
        timestamp: new Date().toISOString()
      },
      {
        id: '3',
        type: 'success',
        category: 'sentiment',
        title: 'Positive Trend in Tone',
        description: 'Recent communications show improved sentiment scores (+15% over last month)',
        confidence: 78,
        impact: 'medium',
        actionable: false,
        timestamp: new Date().toISOString()
      },
      {
        id: '4',
        type: 'error',
        category: 'legal',
        title: 'High-Risk Keywords Detected',
        description: 'Legal terminology and potential dispute language identified in recent messages',
        confidence: 95,
        impact: 'high',
        actionable: true,
        timestamp: new Date().toISOString()
      },
      {
        id: '5',
        type: 'info',
        category: 'timing',
        title: 'Communication Pattern Analysis',
        description: 'Most active communication times: Weekdays 9-11 AM and 3-5 PM',
        confidence: 88,
        impact: 'low',
        actionable: true,
        timestamp: new Date().toISOString()
      }
    ]

    // Filter insights based on current context
    const contextualInsights = currentFilterQuery 
      ? mockInsights.filter(insight => insight.confidence > 80)
      : mockInsights

    setInsights(contextualInsights)
    setLoading(false)
  }

  const generateSmartFilters = () => {
    const mockFilters: SmartFilter[] = [
      {
        id: 'urgent',
        name: 'Urgent Messages',
        description: 'Messages with urgent keywords or exclamation marks',
        query: '(urgent OR URGENT OR emergency OR !!!)',
        active: false,
        count: 12
      },
      {
        id: 'legal',
        name: 'Legal References',
        description: 'Messages containing legal terms or court references',
        query: '(court OR lawyer OR attorney OR custody OR legal)',
        active: false,
        count: 8
      },
      {
        id: 'scheduling',
        name: 'Schedule & Events',
        description: 'Messages about appointments, dates, and scheduling',
        query: '(schedule OR appointment OR meeting OR date OR time)',
        active: false,
        count: 25
      },
      {
        id: 'financial',
        name: 'Financial Matters',
        description: 'Messages about money, support, or financial issues',
        query: '(money OR payment OR support OR financial OR expense)',
        active: false,
        count: 15
      }
    ]

    setSmartFilters(mockFilters)
  }

  const getInsightIcon = (type: string, category: string) => {
    switch (type) {
      case 'warning': return <WarningIcon color="warning" />
      case 'success': return <SuccessIcon color="success" />
      case 'error': return <ErrorIcon color="error" />
      default: return <InfoIcon color="info" />
    }
  }

  const getTrendIcon = (category: string) => {
    switch (category) {
      case 'pattern': return <PatternIcon />
      case 'frequency': return <TrendUpIcon />
      case 'sentiment': return <AIIcon />
      case 'legal': return <LegalIcon />
      case 'timing': return <ScheduleIcon />
      default: return <InsightsIcon />
    }
  }

  const groupInsightsByCategory = () => {
    const grouped = insights.reduce((acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = []
      }
      acc[insight.category].push(insight)
      return acc
    }, {} as Record<string, AnalysisInsight[]>)

    return grouped
  }

  const handleSmartFilterToggle = (filterId: string) => {
    setSmartFilters(prev => 
      prev.map(filter => 
        filter.id === filterId 
          ? { ...filter, active: !filter.active }
          : filter
      )
    )
  }

  const handleExportAnalysis = () => {
    console.log('Exporting analysis data...')
    // TODO: Implement export functionality
  }

  const renderAdvancedInsights = () => {
    if (!showAdvancedInsights) return null

    const groupedInsights = groupInsightsByCategory()

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            AI-Powered Insights
            <Badge badgeContent={insights.length} color="primary" />
          </Typography>
          {loading && <LinearProgress sx={{ width: 100, ml: 2 }} />}
        </Box>

        {Object.entries(groupedInsights).map(([category, categoryInsights]) => (
          <Accordion 
            key={category}
            expanded={expandedInsightCategory === category}
            onChange={() => setExpandedInsightCategory(
              expandedInsightCategory === category ? '' : category
            )}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {getTrendIcon(category)}
                <Typography variant="subtitle2" textTransform="capitalize" fontWeight="bold">
                  {category} Analysis
                </Typography>
                <Badge badgeContent={categoryInsights.length} color="secondary" size="small" />
                {categoryInsights.some(i => i.impact === 'high') && (
                  <StarIcon color="warning" sx={{ fontSize: 16, ml: 'auto' }} />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {categoryInsights.map((insight) => (
                  <Card key={insight.id} variant="outlined" sx={{ border: `1px solid`, borderColor: `${insight.type}.main` }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        {getInsightIcon(insight.type, insight.category)}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {insight.title}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`${insight.confidence}% confidence`}
                              color={insight.confidence > 90 ? 'success' : insight.confidence > 70 ? 'warning' : 'default'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            {insight.impact === 'high' && (
                              <Chip size="small" label="High Impact" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {insight.description}
                          </Typography>
                          {insight.actionable && (
                            <Button size="small" variant="outlined" startIcon={<IdeaIcon />}>
                              View Recommendations
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    )
  }

  const renderSmartFilters = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <FilterIcon color="primary" />
        Smart Filters
      </Typography>
      <Stack spacing={1}>
        {smartFilters.map((filter) => (
          <Card key={filter.id} variant="outlined">
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {filter.name}
                    </Typography>
                    <Badge badgeContent={filter.count} color="primary" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {filter.description}
                  </Typography>
                </Box>
                <Switch
                  checked={filter.active}
                  onChange={() => handleSmartFilterToggle(filter.id)}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  )

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {/* Enhanced Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Badge badgeContent="AI" color="success">
            <AnalyticsIcon sx={{ color: 'primary.main' }} />
          </Badge>
          <Typography variant="h6">
            Enhanced Communication Analysis
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedContact && (
            <Chip
              avatar={<Avatar sx={{ width: 20, height: 20 }}><GroupIcon sx={{ fontSize: 12 }} /></Avatar>}
              label={selectedContact.display_name || selectedContact.name}
              color="primary"
              variant="outlined"
            />
          )}
          {currentFilterQuery && (
            <Chip
              label={`Filtered: ${currentFilterQuery.substring(0, 25)}...`}
              color="warning"
              variant="outlined"
              sx={{ maxWidth: 200 }}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh"
            sx={{ fontSize: '0.8rem' }}
          />
          <ButtonGroup size="small">
            <IconButton size="small" onClick={generateInsights} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <IconButton size="small" onClick={handleExportAnalysis}>
              <ExportIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}
            >
              <SettingsIcon />
            </IconButton>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Enhanced Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(event, newValue) => setActiveTab(newValue)}
          aria-label="enhanced analysis tabs"
        >
          <Tab 
            icon={<TimelineIcon />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Recent Activity
                {insights.filter(i => i.category === 'timing').length > 0 && (
                  <Badge badgeContent={insights.filter(i => i.category === 'timing').length} color="secondary" />
                )}
              </Box>
            }
            {...a11yProps(0)}
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<ChartIcon />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Communication Trends
                {insights.filter(i => i.category === 'frequency').length > 0 && (
                  <Badge badgeContent={insights.filter(i => i.category === 'frequency').length} color="secondary" />
                )}
              </Box>
            }
            {...a11yProps(1)}
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<AIIcon />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                AI Insights
                <Badge badgeContent={insights.length} color="primary" />
              </Box>
            }
            {...a11yProps(2)}
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<FilterIcon />}
            label="Smart Filters"
            {...a11yProps(3)}
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Enhanced Tab Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          {showAdvancedInsights && renderAdvancedInsights()}
          <CommunicationTimeline
            contactId={selectedContact?.id}
            filterQuery={currentFilterQuery}
            sx={{ flex: 1 }}
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {showAdvancedInsights && renderAdvancedInsights()}
          <CommunicationTrendsChart
            contactId={selectedContact?.id}
            filterQuery={currentFilterQuery}
            sx={{ flex: 1 }}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderAdvancedInsights()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderSmartFilters()}
        </TabPanel>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={() => setSettingsMenuAnchor(null)}
      >
        <MenuItem onClick={() => setShowAdvancedInsights(!showAdvancedInsights)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            {showAdvancedInsights ? 'Hide' : 'Show'} AI Insights
          </Box>
        </MenuItem>
        <MenuItem onClick={() => setAutoRefresh(!autoRefresh)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshIcon />
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExportAnalysis}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExportIcon />
            Export Analysis Report
          </Box>
        </MenuItem>
      </Menu>
    </Paper>
  )
}

export default EnhancedCommunicationAnalysis