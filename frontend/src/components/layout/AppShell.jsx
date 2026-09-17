import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, Building2, CheckSquare, ChevronsLeft, Home, Kanban, LogOut, Menu,
  Moon, Search, Sparkles, Sun, UserRound, Users
} from 'lucide-react'
import { Avatar, AvatarFallback, Separator, Tooltip } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { cn, initials } from '@/lib/utils'
import { CommandPalette } from './CommandPalette'

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/home', label: 'Home', icon: Home },
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 }
    ]
  },
  {
    label: 'Records',
    items: [
      { to: '/leads', label: 'Leads', icon: UserRound },
      { to: '/customers', label: 'Customers', icon: Building2 },
      { to: '/deals', label: 'Pipeline', icon: Kanban },
      { to: '/tasks', label: 'Tasks', icon: CheckSquare }
    ]
  },
  {
    label: 'Intelligence',
    items: [{ to: '/predictions', label: 'AI Studio', icon: Sparkles }]
  }
]

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('smartcrm-theme') || 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('smartcrm-theme', theme)
    } catch {
      /* private mode — the theme just won't persist */
    }
  }, [theme])

  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))]
}

function SidebarLink({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-sidebar-foreground hover:bg-accent/60'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMobileOpen(false), [location.pathname])

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <Link to="/home" className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/60">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">S</span>
            <span className="truncate text-sm font-semibold">SmartCRM</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>Search</span>
            <kbd className="ml-auto hidden rounded border bg-background px-1.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} item={item} onNavigate={() => setMobileOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Separator />
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/60">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{initials(user?.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user?.name}</span>
                  <span className="block truncate text-xs capitalize text-muted-foreground">{user?.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="truncate normal-case">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => logout.mutate()}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur lg:px-6">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-1">
            <Tooltip label="Search (⌘K)">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPaletteOpen(true)} aria-label="Search">
                <Search className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </Tooltip>
          </div>
        </header>

        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {segments.map((segment, index) => (
        <span key={segment} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? <span className="text-muted-foreground">/</span> : null}
          <span className={cn('truncate capitalize', index === segments.length - 1 ? 'font-medium' : 'text-muted-foreground')}>
            {segment}
          </span>
        </span>
      ))}
    </nav>
  )
}
