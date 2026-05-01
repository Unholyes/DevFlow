'use client'

import { KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, Settings, User, LogOut, Menu, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { useOrganizationName } from '@/lib/hooks/use-organization-name'

type HeaderUser = {
  fullName: string
  email: string
  avatarUrl: string | null
}

type SearchSuggestion = {
  id: string
  label: string
  href: string
  type: 'project' | 'feature'
  description?: string
}

interface DashboardHeaderProps {
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function DashboardHeader({ isSidebarCollapsed = false, onToggleSidebar }: DashboardHeaderProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<HeaderUser | null>(null)
  const { name: organizationName } = useOrganizationName()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !isMounted) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (!isMounted) return

      setUserInfo({
        fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || 'No email',
        avatarUrl: profile?.avatar_url || null,
      })
    }

    loadUser()
    return () => {
      isMounted = false
    }
  }, [])

  const initials = useMemo(() => {
    const name = userInfo?.fullName
    if (!name) return 'U'
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [userInfo?.fullName])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchSuggestions([])
      setIsSearchLoading(false)
      setActiveSuggestionIndex(-1)
      setIsSearchOpen(false)
      return
    }

    let isCancelled = false
    setIsSearchLoading(true)

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
        const data = await res.json().catch(() => ({}))
        if (isCancelled) return

        const suggestions = Array.isArray(data?.suggestions) ? (data.suggestions as SearchSuggestion[]) : []
        setSearchSuggestions(suggestions)
        setIsSearchOpen(true)
        setActiveSuggestionIndex(suggestions.length > 0 ? 0 : -1)
      } catch {
        if (isCancelled) return
        setSearchSuggestions([])
        setIsSearchOpen(true)
        setActiveSuggestionIndex(-1)
      } finally {
        if (!isCancelled) setIsSearchLoading(false)
      }
    }, 150)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const goToSuggestion = (suggestion: SearchSuggestion) => {
    setSearchQuery('')
    setSearchSuggestions([])
    setIsSearchOpen(false)
    setActiveSuggestionIndex(-1)
    router.push(suggestion.href)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestionIndex((prev) => {
        if (searchSuggestions.length === 0) return -1
        return prev >= searchSuggestions.length - 1 ? 0 : prev + 1
      })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestionIndex((prev) => {
        if (searchSuggestions.length === 0) return -1
        return prev <= 0 ? searchSuggestions.length - 1 : prev - 1
      })
      return
    }

    if (event.key === 'Enter') {
      if (activeSuggestionIndex < 0 || activeSuggestionIndex >= searchSuggestions.length) return
      event.preventDefault()
      goToSuggestion(searchSuggestions[activeSuggestionIndex] as SearchSuggestion)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsSearchOpen(false)
      setActiveSuggestionIndex(-1)
    }
  }

  return (
    <header className="bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo & Toggle */}
        <div className="flex items-center space-x-4">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DevFlow</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects, settings, and features..."
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 rounded-full focus-visible:ring-2 focus-visible:ring-blue-500"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setIsSearchOpen(true)
              }}
              onBlur={() => {
                window.setTimeout(() => setIsSearchOpen(false), 120)
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                {isSearchLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                ) : searchSuggestions.length > 0 ? (
                  <ul className="py-1">
                    {searchSuggestions.map((suggestion, index) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            goToSuggestion(suggestion)
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                            index === activeSuggestionIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">{suggestion.label}</p>
                          <p className="text-xs text-gray-500">
                            {suggestion.type === 'project' ? 'Project' : 'Feature'}
                            {suggestion.description ? ` - ${suggestion.description}` : ''}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Organization */}
          {organizationName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700 truncate max-w-[180px]">
                {organizationName}
              </span>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userInfo?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userInfo?.fullName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userInfo?.email || 'No email'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}