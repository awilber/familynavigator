import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Image as ImageIcon,
  Gavel as CourtIcon,
  AttachMoney as FinancialIcon,
  LocalHospital as MedicalIcon,
  Handshake as AgreementIcon,
  Folder as FolderIcon
} from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { 
  fetchDocumentsSuccess, 
  setFilter,
  Document 
} from './documentsSlice'

const Documents: React.FC = () => {
  const dispatch = useDispatch()
  const { documents, filter } = useSelector((state: RootState) => state.documents)
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    // Mock data - replace with API call
    const mockDocuments: Document[] = [
      {
        id: '1',
        name: 'Custody Agreement - Final.pdf',
        type: 'agreement',
        uploadDate: '2024-01-15T10:00:00',
        modifiedDate: '2024-01-15T10:00:00',
        size: 2456789,
        url: '/documents/custody-agreement.pdf',
        category: 'Legal',
        tags: ['custody', 'final', 'signed'],
        description: 'Final custody agreement signed by both parties'
      },
      {
        id: '2',
        name: 'Court Order - December 2023.pdf',
        type: 'court_order',
        uploadDate: '2023-12-20T14:30:00',
        modifiedDate: '2023-12-20T14:30:00',
        size: 1234567,
        url: '/documents/court-order-dec-2023.pdf',
        category: 'Legal',
        tags: ['court', 'order', 'december'],
        description: 'Court order regarding visitation schedule'
      },
      {
        id: '3',
        name: 'Bank Statement - January 2024.pdf',
        type: 'financial',
        uploadDate: '2024-01-10T09:00:00',
        modifiedDate: '2024-01-10T09:00:00',
        size: 567890,
        url: '/documents/bank-statement-jan-2024.pdf',
        category: 'Financial',
        tags: ['bank', 'statement', 'january'],
        description: 'Monthly bank statement for child support'
      },
      {
        id: '4',
        name: 'Child Medical Records.pdf',
        type: 'medical',
        uploadDate: '2024-01-05T11:00:00',
        modifiedDate: '2024-01-05T11:00:00',
        size: 3456789,
        url: '/documents/medical-records.pdf',
        category: 'Medical',
        tags: ['medical', 'child', 'records'],
        description: 'Complete medical history and vaccination records'
      }
    ]
    dispatch(fetchDocumentsSuccess(mockDocuments))
  }, [dispatch])

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'court_order':
        return <CourtIcon />
      case 'agreement':
        return <AgreementIcon />
      case 'financial':
        return <FinancialIcon />
      case 'medical':
        return <MedicalIcon />
      default:
        return <DocIcon />
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <PdfIcon />
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon />
      default:
        return <DocIcon />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = filter.searchTerm === '' || 
      doc.name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(filter.searchTerm.toLowerCase()))
    
    const matchesType = !filter.type || doc.type === filter.type
    const matchesCategory = !filter.category || doc.category === filter.category

    return matchesSearch && matchesType && matchesCategory
  })

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Documents
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search documents..."
              value={filter.searchTerm}
              onChange={(e) => dispatch(setFilter({ searchTerm: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={filter.type || ''}
                onChange={(e) => dispatch(setFilter({ type: e.target.value || null }))}
                label="Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="court_order">Court Order</MenuItem>
                <MenuItem value="agreement">Agreement</MenuItem>
                <MenuItem value="financial">Financial</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="communication">Communication</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filter.category || ''}
                onChange={(e) => dispatch(setFilter({ category: e.target.value || null }))}
                label="Category"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Legal">Legal</MenuItem>
                <MenuItem value="Financial">Financial</MenuItem>
                <MenuItem value="Medical">Medical</MenuItem>
                <MenuItem value="Personal">Personal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadOpen(true)}
            >
              Upload
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {filteredDocuments.map((doc) => (
          <Grid item xs={12} sm={6} md={4} key={doc.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box 
                    sx={{ 
                      backgroundColor: 'primary.light', 
                      borderRadius: 1, 
                      p: 1, 
                      display: 'flex',
                      mr: 2
                    }}
                  >
                    {getFileIcon(doc.name)}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div" noWrap>
                      {doc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(doc.size)} • {new Date(doc.uploadDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {getDocumentIcon(doc.type)}
                </Box>
                
                {doc.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {doc.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {doc.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <IconButton size="small" color="primary">
                  <ViewIcon />
                </IconButton>
                <IconButton size="small" color="primary">
                  <DownloadIcon />
                </IconButton>
                <IconButton size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        aria-label="upload"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadOpen(true)}
      >
        <UploadIcon />
      </Fab>

      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select a file to upload. Supported formats: PDF, JPG, PNG, DOC, DOCX
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2, height: 100 }}
              startIcon={<UploadIcon />}
            >
              Click to select file or drag and drop here
            </Button>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Document Type</InputLabel>
              <Select label="Document Type">
                <MenuItem value="court_order">Court Order</MenuItem>
                <MenuItem value="agreement">Agreement</MenuItem>
                <MenuItem value="financial">Financial</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="communication">Communication</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Tags (comma separated)"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Documents