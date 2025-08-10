import React from 'react'
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  FormControl,
  Select,
  MenuItem,
  useTheme as useMuiTheme,
  useMediaQuery
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Description as DocumentIcon,
  Warning as IncidentIcon,
  CalendarMonth as CalendarIcon,
  Psychology as AIIcon,
  Logout as LogoutIcon,
  Google as GoogleIcon,
  Message as MessageIcon
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import { useUIMode } from '../contexts/UIModeContext'
import ThemeToggle from './ThemeToggle'

const drawerWidth = 240

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { mode, setMode } = useUIMode()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Documents', icon: <DocumentIcon />, path: '/documents' },
    { text: 'Incidents', icon: <IncidentIcon />, path: '/incidents' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'AI Assistant', icon: <AIIcon />, path: '/assistant' },
  ]

  const communicationsItems = [
    { text: 'Gmail', icon: <GoogleIcon />, path: '/communications/gmail' },
    { text: 'Text Messages', icon: <MessageIcon />, path: '/communications/messages' },
  ]

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Family Navigator
        </Typography>
      </Toolbar>
      <List>
        {/* Dashboard */}
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/dashboard'}
            onClick={() => {
              navigate('/dashboard')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>

        {/* Communications Menu - Always Expanded */}
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname.startsWith('/communications')}
            onClick={() => {
              navigate('/communications')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><EmailIcon /></ListItemIcon>
            <ListItemText primary="Communications" />
          </ListItemButton>
        </ListItem>
        {/* Communications Sub-items - Always Visible */}
        <List component="div" disablePadding>
          {communicationsItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                sx={{ pl: 4 }}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path)
                  if (isMobile) {
                    setMobileOpen(false)
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Remaining Menu Items */}
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/documents'}
            onClick={() => {
              navigate('/documents')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><DocumentIcon /></ListItemIcon>
            <ListItemText primary="Documents" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/incidents'}
            onClick={() => {
              navigate('/incidents')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><IncidentIcon /></ListItemIcon>
            <ListItemText primary="Incidents" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/calendar'}
            onClick={() => {
              navigate('/calendar')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><CalendarIcon /></ListItemIcon>
            <ListItemText primary="Calendar" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/assistant'}
            onClick={() => {
              navigate('/assistant')
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
          >
            <ListItemIcon><AIIcon /></ListItemIcon>
            <ListItemText primary="AI Assistant" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Family Navigator'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'classic' | 'advanced')}
                displayEmpty
                sx={{
                  color: 'inherit',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                  },
                  '.MuiSvgIcon-root': {
                    color: 'inherit',
                  }
                }}
              >
                <MenuItem value="classic">Classic Mode</MenuItem>
                <MenuItem value="advanced">Advanced Mode</MenuItem>
              </Select>
            </FormControl>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          overflow: 'auto'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}

export default Layout