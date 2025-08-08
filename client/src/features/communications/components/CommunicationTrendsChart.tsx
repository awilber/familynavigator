import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Chip
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Communication } from '../types'
import { communicationsApi } from '../services/api'

interface CommunicationTrendsChartProps {
  filterQuery?: string
  contactId?: number
  sx?: object
}

interface ChartDataPoint {
  date: string
  dateObj: Date
  messagesTo: number
  messagesFrom: number
  displayDate: string
}

type TimeRange = '30d' | '90d' | '1y' | 'all'

const CommunicationTrendsChart: React.FC<CommunicationTrendsChartProps> = ({
  filterQuery,
  contactId,
  sx
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('90d')

  useEffect(() => {
    loadChartData()
  }, [filterQuery, contactId, timeRange])

  const loadChartData = async () => {
    if (!filterQuery && !contactId) return

    try {
      setLoading(true)
      setError(null)

      const filters: any = {}
      if (contactId) filters.contact_id = contactId
      if (filterQuery) filters.gmail_query = filterQuery

      // Calculate date range
      const now = new Date()
      let fromDate: Date | undefined
      switch (timeRange) {
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        // 'all' means no date filter
      }

      if (fromDate) {
        filters.date_from = fromDate.toISOString().split('T')[0]
      }

      // Load all communications for the time range
      let allComms: Communication[] = []
      let offset = 0
      const limit = 500
      let hasMore = true

      while (hasMore) {
        const result = await communicationsApi.getCommunications(filters, limit, offset)
        allComms = [...allComms, ...result.communications]
        hasMore = result.hasMore
        offset += limit
        
        // Safety break to prevent infinite loops
        if (allComms.length > 10000) break
      }

      setCommunications(allComms)
    } catch (err) {
      console.error('Error loading chart data:', err)
      setError('Failed to load communication trends data')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!communications.length) return []

    // Group communications by date
    const dailyData = new Map<string, { messagesTo: number; messagesFrom: number }>()

    communications.forEach(comm => {
      const date = new Date(comm.timestamp).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { messagesTo: 0, messagesFrom: 0 })
      }

      const data = dailyData.get(date)!
      
      // Determine direction based on filterQuery
      if (filterQuery) {
        // For filtered queries, check if this communication was TO the filtered address
        const isToFiltered = comm.metadata?.to?.some(email => 
          filterQuery.includes(email) || filterQuery.includes(email.toLowerCase())
        )
        const isFromFiltered = comm.contact_email?.includes(filterQuery.replace(/[()]/g, '').split(' ')[0]?.replace('from:', ''))

        if (isToFiltered) {
          data.messagesTo++
        } else if (comm.direction === 'outgoing' || isFromFiltered) {
          data.messagesFrom++
        }
      } else {
        // For contact-based filtering
        if (comm.direction === 'incoming') {
          data.messagesFrom++
        } else {
          data.messagesTo++
        }
      }
    })

    // Convert to array and sort by date
    const result: ChartDataPoint[] = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        dateObj: new Date(date),
        messagesTo: data.messagesTo,
        messagesFrom: data.messagesFrom,
        displayDate: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        })
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

    return result
  }, [communications, filterQuery])

  const getSelectedEmail = () => {
    if (!filterQuery) return 'Selected Contact'
    
    // Extract email from query like "(from:email OR to:email)"
    const emailMatch = filterQuery.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    return emailMatch ? emailMatch[1] : 'Filtered Address'
  }

  const getTotalMessages = () => {
    return chartData.reduce((sum, point) => sum + point.messagesTo + point.messagesFrom, 0)
  }

  const getDateRangeLabel = () => {
    if (chartData.length === 0) return 'No data'
    
    const firstDate = chartData[0].dateObj
    const lastDate = chartData[chartData.length - 1].dateObj
    
    return `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`
  }

  if (loading) {
    return (
      <Box sx={{ ...sx, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading communication trends...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ ...sx, p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!filterQuery && !contactId) {
    return (
      <Box sx={{ 
        ...sx,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 4,
        color: 'text.secondary'
      }}>
        <Typography variant="h6">Select an Email Address or Contact</Typography>
        <Typography variant="body2" textAlign="center">
          Use the Email Filtering panel to select an address, or choose a contact from the Contacts list 
          to view communication trends over time.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ ...sx, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with controls */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Communication Trends: {getSelectedEmail()}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`${getTotalMessages()} total messages`} 
              size="small" 
              color="primary" 
            />
            <Chip 
              label={getDateRangeLabel()} 
              size="small" 
              variant="outlined" 
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl size="small" sx={{ minWidth: 120, float: { md: 'right' } }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Chart */}
      <Paper elevation={1} sx={{ flex: 1, p: 2, minHeight: 400 }}>
        {chartData.length === 0 ? (
          <Box sx={{ 
            height: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            color: 'text.secondary'
          }}>
            <Typography variant="h6">No Data Available</Typography>
            <Typography variant="body2" textAlign="center">
              No communications found for the selected criteria and time range.
              Try adjusting the time range or filter selection.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.max(1, Math.floor(chartData.length / 10))}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Number of Messages', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const dataPoint = payload[0].payload as ChartDataPoint
                    return dataPoint.dateObj.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }
                  return label
                }}
                formatter={(value: number, name: string) => [
                  `${value} message${value !== 1 ? 's' : ''}`,
                  name
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '14px'
                }}
              />
              <Line
                type="monotone"
                dataKey="messagesTo"
                stroke="#2196F3"
                strokeWidth={2}
                dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name={`Messages To ${getSelectedEmail()}`}
              />
              <Line
                type="monotone"
                dataKey="messagesFrom"
                stroke="#FF9800"
                strokeWidth={2}
                dot={{ fill: '#FF9800', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name={`Messages From ${getSelectedEmail()}`}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  )
}

export default CommunicationTrendsChart