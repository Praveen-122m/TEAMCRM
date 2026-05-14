import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // Light mode matches the UI images
    primary: {
      main: '#5a67d8', // Indigo/Purple color from the UI
    },
    secondary: {
      main: '#48bb78', // Green for online status/success
    },
    background: {
      default: '#f4f5f7', // Light gray background for the app area
      paper: '#ffffff', // White for cards, sidebars, and modals
    },
    divider: '#e2e8f0', // Soft gray for borders
    text: {
      primary: '#1a202c',
      secondary: '#718096',
    }
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 12, // Rounded corners matching the modern UI
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(90, 103, 216, 0.2)',
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          '&.Mui-selected': {
            backgroundColor: '#edf2f7',
            color: '#5a67d8',
            '& .MuiListItemIcon-root': {
              color: '#5a67d8',
            }
          }
        }
      }
    }
  },
});

export default theme;
