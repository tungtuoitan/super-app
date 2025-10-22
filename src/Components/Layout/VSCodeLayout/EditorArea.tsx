import { Box, Tab, Tabs, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'

interface EditorTab {
  id: string
  title: string
  path: string
  isDirty?: boolean
}

interface EditorAreaProps {
  tabs?: EditorTab[]
}

export function EditorArea({ tabs = [] }: EditorAreaProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>(
    tabs.length > 0
      ? tabs
      : [
          { id: '1', title: 'Welcome', path: 'Welcome' },
          { id: '2', title: 'FlexibleLayout.tsx', path: 'src/components/Layout/FlexibleLayout.tsx', isDirty: true },
          { id: '3', title: 'package.json', path: 'package.json' },
        ]
  )

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setEditorTabs(editorTabs.filter(tab => tab.id !== tabId))
    if (activeTab >= editorTabs.length - 1) {
      setActiveTab(Math.max(0, editorTabs.length - 2))
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgb(30, 30, 30)',
      }}
    >
      {/* Tabs Bar */}
      <Box
        sx={{
          backgroundColor: 'rgb(37, 37, 38)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          minHeight: '35px',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: '35px',
            flex: 1,
            '& .MuiTabs-indicator': {
              backgroundColor: '#007acc',
              height: '1px',
            },
            '& .MuiTab-root': {
              minHeight: '35px',
              minWidth: '120px',
              padding: '0 12px',
              textTransform: 'none',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              '&.Mui-selected': {
                color: '#fff',
                backgroundColor: 'rgb(30, 30, 30)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            },
          }}
        >
          {editorTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{tab.isDirty ? '● ' : ''}{tab.title}</span>
                  <IconButton
                    size="small"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    sx={{
                      padding: '2px',
                      color: 'inherit',
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: '14px' }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Editor Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          fontFamily: "'Consolas', 'Courier New', monospace",
          fontSize: '14px',
          lineHeight: '21px',
          color: '#d4d4d4',
        }}
      >
        {editorTabs[activeTab] && (
          <Box>
            <Box sx={{ marginBottom: '16px', opacity: 0.6, fontSize: '12px' }}>
              {editorTabs[activeTab].path}
            </Box>
            <Box
              sx={{
                whiteSpace: 'pre',
                '& .line-number': {
                  display: 'inline-block',
                  width: '40px',
                  textAlign: 'right',
                  paddingRight: '16px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  userSelect: 'none',
                },
              }}
            >
              {editorTabs[activeTab].title === 'Welcome' ? (
                <Box sx={{ padding: '24px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  <h2>Welcome to VS Code Style Layout</h2>
                  <p>This is a demo editor area. Your content will appear here.</p>
                </Box>
              ) : (
                <>
                  <div>
                    <span className="line-number">1</span>
                    <span style={{ color: '#c586c0' }}>import</span>
                    <span> {'{'} useState {'}'} </span>
                    <span style={{ color: '#c586c0' }}>from</span>
                    <span style={{ color: '#ce9178' }}> 'react'</span>
                  </div>
                  <div>
                    <span className="line-number">2</span>
                  </div>
                  <div>
                    <span className="line-number">3</span>
                    <span style={{ color: '#c586c0' }}>export</span>
                    <span style={{ color: '#c586c0' }}> function </span>
                    <span style={{ color: '#dcdcaa' }}>Component</span>
                    <span>() {'{'}</span>
                  </div>
                  <div>
                    <span className="line-number">4</span>
                    <span>  </span>
                    <span style={{ color: '#569cd6' }}>const</span>
                    <span> [state, setState] = </span>
                    <span style={{ color: '#dcdcaa' }}>useState</span>
                    <span>(</span>
                    <span style={{ color: '#b5cea8' }}>0</span>
                    <span>)</span>
                  </div>
                  <div>
                    <span className="line-number">5</span>
                    <span>  </span>
                    <span style={{ color: '#c586c0' }}>return</span>
                    <span> </span>
                    <span style={{ color: '#808080' }}>{'<'}div{'>'}Hello{'</'}div{'>'}</span>
                  </div>
                  <div>
                    <span className="line-number">6</span>
                    <span>{'}'}</span>
                  </div>
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
