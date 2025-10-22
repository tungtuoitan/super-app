import { Box, IconButton, Tooltip } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'

export type ActivityBarView = 'explorer' | 'tags' | 'notes'

interface ActivityBarProps {
  activeView: ActivityBarView
  onViewChange: (view: ActivityBarView) => void
}

const activities = [
  { id: 'explorer' as const, icon: FolderIcon, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'tags' as const, icon: LocalOfferIcon, label: 'Tags', shortcut: 'Ctrl+Shift+T' },
  { id: 'notes' as const, icon: DescriptionIcon, label: 'Notes', shortcut: 'Ctrl+Shift+N' },
]

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <Box
      sx={{
        width: '48px',
        height: '100%',
        backgroundColor: 'rgb(51, 51, 51)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '4px',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Activity icons */}
      <Box sx={{ flex: 1 }}>
        {activities.map((activity) => {
          const Icon = activity.icon
          const isActive = activeView === activity.id
          
          return (
            <Tooltip key={activity.id} title={`${activity.label} (${activity.shortcut})`} placement="right">
              <IconButton
                onClick={() => onViewChange(activity.id)}
                sx={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 0,
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  borderLeft: isActive ? '2px solid #007acc' : '2px solid transparent',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                  },
                }}
              >
                <Icon />
              </IconButton>
            </Tooltip>
          )
        })}
      </Box>

      {/* Settings at bottom */}
      <Box sx={{ paddingBottom: '4px' }}>
        <Tooltip title="Settings (Ctrl+,)" placement="right">
          <IconButton
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
              },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
