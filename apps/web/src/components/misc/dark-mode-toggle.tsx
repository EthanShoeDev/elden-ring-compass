import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/providers/theme-context';
import { Button } from '@/components/ui/button';

export function DarkModeToggle({
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setThemePreference, theme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => {
        setThemePreference(theme === 'dark' ? 'light' : 'dark');
      }}
      {...props}
    >
      <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
      <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
      <span className='sr-only'>Toggle theme</span>
    </Button>
  );
}
