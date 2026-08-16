/**
 * Design System Profissional - AO PONTO BR
 * Sistema centralizado de cores, tipografia e componentes
 * Inspirado em portais como Folha, G1, UOL
 */

export const colors = {
  // Cores Primárias
  primary: {
    red: '#991B1B',      // Vermelho principal (institucional)
    red_light: '#E83E3E', // Vermelho claro (hover)
    red_dark: '#A00000',  // Vermelho escuro (ativo/pressed)
    red_faded: '#F5ECEB', // Vermelho muito claro (fundo)
  },

  // Cores Neutras
  neutral: {
    white: '#FFFFFF',
    black: '#111111',
    gray_50: '#F9F9F9',
    gray_100: '#F5F5F5',
    gray_200: '#E8E8E8',
    gray_300: '#D4D4D4',
    gray_400: '#A8A8A8',
    gray_500: '#767676',
    gray_600: '#555555',
    gray_700: '#333333',
    gray_800: '#222222',
    gray_900: '#000000',
  },

  // Cores Semânticas
  semantic: {
    success: '#00A651',   // Verde sucesso
    warning: '#F09C00',   // Laranja aviso
    error: '#D32F2F',     // Vermelho erro
    info: '#87CEEB',      // Azul informação
  },

  // Backgrounds
  backgrounds: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#EBEBEB',
    dark: '#111111',
  },
};

export const typography = {
  // Headlines
  h1: {
    fontSize: '2.5rem',     // 40px
    fontWeight: 700,
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',       // 32px
    fontWeight: 700,
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',     // 24px
    fontWeight: 600,
    lineHeight: '1.4',
  },
  h4: {
    fontSize: '1.25rem',    // 20px
    fontWeight: 600,
    lineHeight: '1.4',
  },
  h5: {
    fontSize: '1.125rem',   // 18px
    fontWeight: 600,
    lineHeight: '1.5',
  },
  h6: {
    fontSize: '1rem',       // 16px
    fontWeight: 600,
    lineHeight: '1.5',
  },

  // Body Text
  body: {
    lg: {
      fontSize: '1.125rem',  // 18px
      fontWeight: 400,
      lineHeight: '1.6',
    },
    base: {
      fontSize: '1rem',      // 16px
      fontWeight: 400,
      lineHeight: '1.6',
    },
    sm: {
      fontSize: '0.875rem',  // 14px
      fontWeight: 400,
      lineHeight: '1.5',
    },
    xs: {
      fontSize: '0.75rem',   // 12px
      fontWeight: 400,
      lineHeight: '1.4',
    },
  },

  // Labels & Captions
  label: {
    fontSize: '0.875rem',   // 14px
    fontWeight: 500,
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '0.75rem',    // 12px
    fontWeight: 400,
    lineHeight: '1.4',
    color: '#767676',
  },
};

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem',   // 48px
  '4xl': '4rem',   // 64px
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  elevation: '0 12px 24px rgba(0, 0, 0, 0.15)',
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const transitions = {
  fast: '150ms ease-out',
  base: '200ms ease-out',
  slow: '300ms ease-out',
  slower: '500ms ease-out',
};

/**
 * Variações de Button
 */
export const buttonVariants = {
  primary: {
    bg: colors.primary.red,
    text: colors.neutral.white,
    hover: colors.primary.red_light,
    active: colors.primary.red_dark,
    border: 'transparent',
  },
  secondary: {
    bg: colors.neutral.gray_100,
    text: colors.neutral.gray_700,
    hover: colors.neutral.gray_200,
    active: colors.neutral.gray_300,
    border: colors.neutral.gray_200,
  },
  ghost: {
    bg: 'transparent',
    text: colors.primary.red,
    hover: colors.primary.red_faded,
    active: colors.neutral.gray_100,
    border: 'transparent',
  },
  danger: {
    bg: colors.semantic.error,
    text: colors.neutral.white,
    hover: '#E53E3E',
    active: '#C53030',
    border: 'transparent',
  },
};

/**
 * Variações de Input
 */
export const inputVariants = {
  default: {
    bg: colors.neutral.white,
    border: colors.neutral.gray_300,
    text: colors.neutral.gray_900,
    placeholder: colors.neutral.gray_500,
    focus: colors.primary.red,
  },
  filled: {
    bg: colors.neutral.gray_100,
    border: colors.neutral.gray_200,
    text: colors.neutral.gray_900,
    placeholder: colors.neutral.gray_500,
    focus: colors.primary.red,
  },
};

/**
 * Profundidade (z-index)
 */
export const zIndex = {
  hide: '-1',
  base: '0',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
};

/**
 * Animation Keyframes
 */
export const animations = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  slideDown: `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
};
