    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['"Young Serif"', 'Georgia', 'serif'],
            sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
            mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
          },
          colors: {
            paper: '#e9e7db',
            'paper-raised': '#f2f0e5',
            'paper-deep': '#dddbca',
            olive: '#2e3a26',
            'olive-700': '#3b4a30',
            ink: '#232a1c',
            'ink-soft': '#575c42',
            line: '#d2ceb7',
            'line-strong': '#b7b191',
            ochre: '#a5611a',
            'ochre-deep': '#834a12',
            'on-olive': '#eae7d5',
            'on-olive-soft': '#aeb397',
            'ochre-bright': '#dc9142',
          },
          maxWidth: { shell: '72rem' },
          boxShadow: {
            field: '0 1px 2px rgba(35,42,28,0.05), 0 16px 34px -20px rgba(35,42,28,0.28)',
            'field-lift': '0 2px 6px rgba(35,42,28,0.08), 0 30px 55px -24px rgba(35,42,28,0.34)',
          },
        },
      },
    };
