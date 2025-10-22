import { Box, Tab, Tabs, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TerminalIcon from '@mui/icons-material/Terminal'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import OutputIcon from '@mui/icons-material/Output'
import BugReportIcon from '@mui/icons-material/BugReport'
import { useState } from 'react'

interface PanelProps {
  isVisible: boolean
  onClose: () => void
}

type PanelTab = 'terminal' | 'problems' | 'output' | 'debug'

export function Panel({ isVisible, onClose }: PanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal')

  if (!isVisible) return null

  return (
    <Box
      sx={{
        height: '250px',
        backgroundColor: 'rgb(30, 30, 30)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tabs */}
      <Box
        sx={{
          backgroundColor: 'rgb(37, 37, 38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: '35px',
            '& .MuiTabs-indicator': {
              backgroundColor: '#007acc',
            },
            '& .MuiTab-root': {
              minHeight: '35px',
              minWidth: '80px',
              padding: '0 16px',
              textTransform: 'none',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
              '&.Mui-selected': {
                color: '#fff',
              },
            },
          }}
        >
          <Tab
            value="terminal"
            icon={<TerminalIcon sx={{ fontSize: '16px' }} />}
            iconPosition="start"
            label="Terminal"
          />
          <Tab
            value="problems"
            icon={<ErrorOutlineIcon sx={{ fontSize: '16px' }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Problems
                <Box
                  component="span"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '0 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                >
                  2
                </Box>
              </Box>
            }
          />
          <Tab
            value="output"
            icon={<OutputIcon sx={{ fontSize: '16px' }} />}
            iconPosition="start"
            label="Output"
          />
          <Tab
            value="debug"
            icon={<BugReportIcon sx={{ fontSize: '16px' }} />}
            iconPosition="start"
            label="Debug Console"
          />
        </Tabs>

        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            marginRight: '8px',
            color: 'rgba(255, 255, 255, 0.6)',
            '&:hover': {
              color: '#fff',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: '18px' }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 16px',
          fontFamily: "'Consolas', 'Courier New', monospace",
          fontSize: '13px',
          lineHeight: '19px',
          color: '#cccccc',
        }}
      >
        {activeTab === 'terminal' && (
          <Box>
            <Box sx={{ color: '#4ec9b0' }}>
              <span style={{ color: '#858585' }}>PS</span> C:\Users\Admin\source\super-app\SuperApp-frontend{' '}
              <span style={{ color: '#fff', animation: 'blink 1s infinite' }}>▋</span>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', marginTop: '16px', opacity: 0.6 }}>
              Terminal ready. Type commands here...
            </Typography>
          </Box>
        )}

        {activeTab === 'problems' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: '16px', color: '#f48771' }} />
              <Typography variant="body2">
                Cannot find module '@/types/common.types' or its corresponding type declarations.
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: '16px', color: '#cca700' }} />
              <Typography variant="body2">
                'useState' is defined but never used.
              </Typography>
            </Box>
          </Box>
        )}

        {activeTab === 'output' && (
          <Box>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>
              [Extension Host] Extension activated
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>
              [Extension Host] Initializing...
            </Typography>
          </Box>
        )}

        {activeTab === 'debug' && (
          <Box>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>
              Debug console is ready. Start debugging to see output here.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
