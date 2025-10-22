import { Box } from '@mui/material'
import GitBranchIcon from '@mui/icons-material/CallSplit'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import NotificationsIcon from '@mui/icons-material/Notifications'

export function StatusBar() {
  return (
    <Box
      sx={{
        height: '22px',
        backgroundColor: '#007acc',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: '12px',
        borderTop: '1px solid rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Left side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Git branch */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <GitBranchIcon sx={{ fontSize: '14px' }} />
          <span>master-dev</span>
        </Box>

        {/* Sync status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <span>↓0</span>
          <span>↑0</span>
        </Box>

        {/* Errors and warnings */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ErrorIcon sx={{ fontSize: '14px' }} />
            <span>1</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <WarningIcon sx={{ fontSize: '14px' }} />
            <span>1</span>
          </Box>
        </Box>
      </Box>

      {/* Right side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Line/Column */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Ln 45, Col 12
        </Box>

        {/* Spaces */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Spaces: 2
        </Box>

        {/* Encoding */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          UTF-8
        </Box>

        {/* Line ending */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          CRLF
        </Box>

        {/* Language */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          TypeScript React
        </Box>

        {/* Notifications */}
        <Box
          sx={{
            cursor: 'pointer',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: '14px' }} />
        </Box>
      </Box>
    </Box>
  )
}
