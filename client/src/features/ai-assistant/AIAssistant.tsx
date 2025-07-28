import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  CircularProgress
} from '@mui/material'
import {
  Send as SendIcon,
  Psychology as AIIcon,
  Person as PersonIcon,
  Lightbulb as IdeaIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AttachFile as AttachIcon
} from '@mui/icons-material'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  type?: 'text' | 'advice' | 'warning' | 'info'
}

interface QuickPrompt {
  label: string
  prompt: string
  icon: React.ReactNode
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Family Navigator AI Assistant. I can help you with advice on co-parenting, analyze communications, review documents, and provide guidance on handling various situations. How can I assist you today?',
      timestamp: new Date().toISOString(),
      type: 'text'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const quickPrompts: QuickPrompt[] = [
    {
      label: 'Communication Advice',
      prompt: 'How should I respond to a hostile message from my ex?',
      icon: <IdeaIcon />
    },
    {
      label: 'Legal Question',
      prompt: 'What should I document for court?',
      icon: <InfoIcon />
    },
    {
      label: 'Co-parenting Tips',
      prompt: 'How can I improve communication with my co-parent?',
      icon: <PersonIcon />
    },
    {
      label: 'Emergency Guidance',
      prompt: 'What should I do if pickup is refused?',
      icon: <WarningIcon />
    }
  ]

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Simulate AI response - replace with actual API call
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(input),
        timestamp: new Date().toISOString(),
        type: determineResponseType(input)
      }
      setMessages(prev => [...prev, aiResponse])
      setLoading(false)
    }, 1500)
  }

  const generateMockResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    
    if (input.includes('hostile') || input.includes('angry')) {
      return 'When dealing with hostile communication, it\'s important to:\n\n1. **Stay calm and professional** - Don\'t respond emotionally\n2. **Document everything** - Save all messages for your records\n3. **Stick to facts** - Keep responses brief and factual\n4. **Use "I" statements** - Express your needs without blame\n5. **Consider using a parenting app** - This creates a record and may encourage better behavior\n\nWould you like me to help draft a response to a specific message?'
    }
    
    if (input.includes('document') || input.includes('court')) {
      return 'For court documentation, you should maintain:\n\n1. **Communication logs** - All emails, texts, and messages\n2. **Incident reports** - Date, time, location, and details of any violations\n3. **Financial records** - Receipts for child-related expenses\n4. **Medical records** - Doctor visits, medications, treatments\n5. **School records** - Report cards, attendance, communications\n6. **Photos/videos** - Visual evidence when relevant\n\nI recommend organizing these chronologically and backing them up securely.'
    }
    
    if (input.includes('pickup') || input.includes('refused')) {
      return '⚠️ If pickup is refused:\n\n1. **Document immediately** - Time, location, any communication\n2. **Don\'t force the situation** - Avoid confrontation, especially in front of children\n3. **Contact your attorney** - Get legal advice for your specific situation\n4. **File a police report** - If it\'s a violation of court orders\n5. **Follow up in writing** - Send a factual email documenting what occurred\n\nThis is a serious violation that needs proper documentation for legal action.'
    }
    
    return 'I understand your concern. Based on what you\'ve shared, I recommend documenting this situation thoroughly and consulting with your attorney if it involves a violation of your custody agreement. Would you like specific guidance on any aspect of this situation?'
  }

  const determineResponseType = (input: string): Message['type'] => {
    const lower = input.toLowerCase()
    if (lower.includes('emergency') || lower.includes('refused') || lower.includes('danger')) {
      return 'warning'
    }
    if (lower.includes('advice') || lower.includes('should')) {
      return 'advice'
    }
    if (lower.includes('what') || lower.includes('how') || lower.includes('legal')) {
      return 'info'
    }
    return 'text'
  }

  const getMessageIcon = (type?: Message['type']) => {
    switch (type) {
      case 'warning':
        return <WarningIcon color="error" />
      case 'advice':
        return <IdeaIcon color="primary" />
      case 'info':
        return <InfoIcon color="info" />
      default:
        return <AIIcon />
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>
        AI Assistant
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Quick Prompts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {quickPrompts.map((prompt, index) => (
              <Chip
                key={index}
                label={prompt.label}
                icon={prompt.icon as React.ReactElement}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                clickable
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message, index) => (
            <React.Fragment key={message.id}>
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                    {message.role === 'user' ? <PersonIcon /> : getMessageIcon(message.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          mt: 1,
                          p: 2,
                          bgcolor: message.role === 'user' ? 'grey.100' : 'background.paper',
                          borderRadius: 1,
                          border: message.type === 'warning' ? '1px solid' : 'none',
                          borderColor: message.type === 'warning' ? 'error.main' : 'transparent'
                        }}
                      >
                        {message.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < messages.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
          {loading && (
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <AIIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="AI Assistant"
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Thinking...</Typography>
                  </Box>
                }
              />
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>

        <Divider />
        
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small">
              <AttachIcon />
            </IconButton>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask me anything about co-parenting, legal matters, or handling difficult situations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              multiline
              maxRows={4}
              size="small"
            />
            <IconButton 
              color="primary" 
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <SendIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This AI assistant provides general guidance. Always consult with your attorney for legal advice.
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default AIAssistant