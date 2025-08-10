import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
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
import { 
  TrendingUp as TrendingUpIcon,
  Sync as SyncIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material'

interface CommunicationData {
  period: string
  date: Date
  person1Count: number
  person2Count: number
  total: number
}

interface EmailRecord {
  id: number
  timestamp: string
  direction: 'incoming' | 'outgoing'
  subject: string
  from: string
  to: string
  person: 'person1' | 'person2'
}

interface CommunicationOverviewChartProps {
  sx?: object
}

const CommunicationOverviewChart: React.FC<CommunicationOverviewChartProps> = ({ sx }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [person1, setPerson1] = useState<string>('awilber@gmail.com')
  const [person2, setPerson2] = useState<string>('alexapowell@gmail.com')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CommunicationData[]>([])
  const [emailData, setEmailData] = useState<EmailRecord[]>([])
  const [activeTab, setActiveTab] = useState(0)

  // Available people for selection
  const availablePeople = [
    { email: 'awilber@gmail.com', name: 'awilber' },
    { email: 'alexapowell@gmail.com', name: 'alexapowell' },
    { email: 'elizabethnwilber@gmail.com', name: 'elizabethnwilber' },
    { email: 'a.wilber@gmail.com', name: 'a.wilber' },
    { email: 'dkenet@googlegroups.com', name: 'dkenet' }
  ]

  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true)
      try {
        // Load chart data
        const chartResponse = await fetch(`/api/communications/overview-chart?person1=${encodeURIComponent(person1)}&person2=${encodeURIComponent(person2)}&timeRange=${timeRange}`)
        if (!chartResponse.ok) {
          throw new Error('Failed to fetch chart data')
        }
        const chartResult = await chartResponse.json()
        
        // Load email records for the table - use same filtering logic as chart
        const emailResponse = await fetch(`/api/communications/between-persons?person1=${encodeURIComponent(person1)}&person2=${encodeURIComponent(person2)}&limit=50`)
        let emailRecords: EmailRecord[] = []
        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          if (emailResult.success && emailResult.data) {
            emailRecords = emailResult.data.map((email: any) => ({
              id: email.id,
              timestamp: email.timestamp,
              direction: email.direction,
              subject: email.subject,
              from: email.from,
              to: email.to,
              person: email.person
            }))
          }
        }

        if (chartResult.success && chartResult.data) {
          setData(chartResult.data.map((item: any) => ({
            period: item.period,
            date: new Date(item.date),
            person1Count: item.person1Count,
            person2Count: item.person2Count,
            total: item.total
          })))
          setEmailData(emailRecords)
        } else {
          console.error('API returned error:', chartResult.error || 'Unknown error')
          setData([])
          setEmailData([])
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
        setData([])
        setEmailData([])
      } finally {
        setLoading(false)
      }
    }

    loadChartData()
  }, [timeRange, person1, person2])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          border: 1, 
          borderColor: 'divider',
          borderRadius: 1,
          p: 2,
          boxShadow: 2
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, mb: 0.5 }}
            >
              {entry.name}: {entry.value} emails sent
            </Typography>
          ))}
          <Typography variant="body2" color="text.secondary">
            Total: {payload[0].payload.total} messages
          </Typography>
        </Box>
      )
    }
    return null
  }

  const getPersonName = (email: string) => {
    const person = availablePeople.find(p => p.email === email)
    return person?.name || email.split('@')[0]
  }

  const person1Name = getPersonName(person1)
  const person2Name = getPersonName(person2)

  // Handle filtered sync to get more data between selected people
  const handleFilteredSync = async (maxMessages: number = 50) => {
    try {
      const options = {
        batchSize: Math.min(25, maxMessages), // Keep batch size reasonable
        maxMessages,
        filterPersons: [person1, person2],
        expandDateRange: true // Go back further to find historical messages
      }

      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      
      if (response.ok) {
        // Reload data after sync completes
        setTimeout(() => {
          window.location.reload() // Simple approach to refresh data
        }, 2000)
      }
    } catch (error) {
      console.error('Error starting filtered sync:', error)
    }
  }

  return (
    <Card sx={{ ...sx, mb: 3, minHeight: 500 }}>
      <CardContent sx={{ pb: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Communication Overview
            </Typography>
            <Chip 
              label="Interactive"
              size="small"
              color="primary"
              sx={{ ml: 2, height: 24 }}
            />
          </Box>

          {/* Legend with Color Blocks and Direction Context */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#1976d2', 
                borderRadius: 1,
                border: '2px solid #1976d2'
              }} />
              <Typography variant="body2" fontWeight="bold" color="#1976d2">
                {person1Name} → {person2Name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#ed6c02', 
                borderRadius: 1,
                border: '2px solid #ed6c02'
              }} />
              <Typography variant="body2" fontWeight="bold" color="#ed6c02">
                {person2Name} → {person1Name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Person Selection */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Person 1</InputLabel>
              <Select
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                label="Person 1"
              >
                {availablePeople.map((person) => (
                  <MenuItem key={person.email} value={person.email}>
                    {person.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Person 2</InputLabel>
              <Select
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                label="Person 2"
              >
                {availablePeople.map((person) => (
                  <MenuItem key={person.email} value={person.email}>
                    {person.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Time Range Toggle */}
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(e, newRange) => newRange && setTimeRange(newRange)}
              size="small"
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="year">Year</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Filtered Sync Options */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2, 
          p: 2, 
          bgcolor: 'action.hover',
          borderRadius: 1 
        }}>
          <Typography variant="body2" color="text.secondary">
            Need more data between {person1Name} and {person2Name}? Sync historical emails:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={() => handleFilteredSync(25)}
              color="primary"
            >
              Sync 25
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={() => handleFilteredSync(50)}
              color="primary"
            >
              Sync 50
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={() => handleFilteredSync(100)}
              color="secondary"
            >
              Sync 100
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Chart View" />
            <Tab label="Between Persons" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ height: 400, position: 'relative' }}>
          {activeTab === 0 && (
            <>
              {loading ? (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column'
                }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading communication data...
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="period"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="person1Count"
                      stroke="#1976d2"
                      strokeWidth={3}
                      dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#1976d2' }}
                      name={`${person1Name} → ${person2Name}`}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="person2Count"
                      stroke="#ed6c02"
                      strokeWidth={3}
                      dot={{ fill: '#ed6c02', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#ed6c02' }}
                      name={`${person2Name} → ${person1Name}`}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
          
          {activeTab === 1 && (
            <TableContainer component={Paper} sx={{ height: '100%', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Person</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emailData.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        {new Date(email.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={email.direction} 
                          color={email.direction === 'outgoing' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.from}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.to}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={email.person === 'person1' ? person1Name : person2Name}
                          color={email.person === 'person1' ? 'primary' : 'warning'}
                          size="small"
                          sx={{
                            backgroundColor: email.person === 'person1' ? '#1976d220' : '#ed6c0220',
                            color: email.person === 'person1' ? '#1976d2' : '#ed6c02',
                            borderColor: email.person === 'person1' ? '#1976d2' : '#ed6c02'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {emailData.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No emails found between {person1Name} and {person2Name}. Connect Gmail and sync emails to see communication exchanges.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Summary Stats */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          mt: 2, 
          pt: 2, 
          borderTop: 1, 
          borderColor: 'divider' 
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {data.reduce((sum, d) => sum + d.person1Count, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {person1Name} total
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main" fontWeight="bold">
              {data.reduce((sum, d) => sum + d.person2Count, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {person2Name} total
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {data.reduce((sum, d) => sum + d.total, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Combined total
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default CommunicationOverviewChart