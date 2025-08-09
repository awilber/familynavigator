import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
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
  InputLabel
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
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material'

interface CommunicationData {
  period: string
  date: Date
  person1Count: number
  person2Count: number
  total: number
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
        const response = await fetch(`/api/communications/overview-chart?person1=${encodeURIComponent(person1)}&person2=${encodeURIComponent(person2)}&timeRange=${timeRange}`)
        if (!response.ok) {
          throw new Error('Failed to fetch chart data')
        }
        const result = await response.json()
        if (result.success && result.data) {
          setData(result.data.map((item: any) => ({
            period: item.period,
            date: new Date(item.date),
            person1Count: item.person1Count,
            person2Count: item.person2Count,
            total: item.total
          })))
        } else {
          console.error('API returned error:', result.error || 'Unknown error')
          setData([])
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
        setData([])
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
              {entry.name}: {entry.value} messages
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

  return (
    <Card sx={{ ...sx, mb: 3 }}>
      <CardContent>
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

        {/* Chart */}
        <Box sx={{ height: 300, position: 'relative' }}>
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
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                  name={person1Name}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="person2Count"
                  stroke="#ed6c02"
                  strokeWidth={3}
                  dot={{ fill: '#ed6c02', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ed6c02' }}
                  name={person2Name}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
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