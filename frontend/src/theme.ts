import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#388e3c',
    },
    secondary: {
      main: '#d4a373',
    },
    background: {
      default: '#f5fbe7',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      'Fredoka One',
      'Baloo',
      'Luckiest Guy',
      'sans-serif',
    ].join(','),
  },
});

export default theme; 