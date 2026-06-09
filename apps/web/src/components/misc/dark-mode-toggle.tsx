import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/providers/theme-provider';
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
      <Sun className='size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
      <Moon className='absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
      <span className='sr-only'>Toggle theme</span>
    </Button>
  );
}
