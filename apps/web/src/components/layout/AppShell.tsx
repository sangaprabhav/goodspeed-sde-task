'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { conversationsApi, toErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

const SIDEBAR_STORAGE_KEY = 'knowledge-base-sidebar-collapsed';

function groupByDate(conversations: { id: string; title: string; updatedAt: string }[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: typeof conversations }[] = [];
  const todayItems: typeof conversations = [];
  const yesterdayItems: typeof conversations = [];
  const olderItems: typeof conversations = [];

  for (const c of conversations) {
    const d = new Date(c.updatedAt).toDateString();
    if (d === today) todayItems.push(c);
    else if (d === yesterday) yesterdayItems.push(c);
    else olderItems.push(c);
  }

  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (olderItems.length) groups.push({ label: 'Previous', items: olderItems });
  return groups;
}

interface SidebarProps {
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}

interface SidebarLinkProps {
  active: boolean;
  collapsed: boolean;
  href: string;
  icon: ComponentType<{ size?: number }>;
  label: string;
  onNavigate?: () => void;
}

function SidebarLink({
  active,
  collapsed,
  href,
  icon: Icon,
  label,
  onNavigate,
}: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`mb-1 flex h-10 items-center rounded-xl text-sm transition-all ${
        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
      } ${
        active
          ? 'glass-nav-active text-white'
          : 'text-white/75 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={17} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function Sidebar({
  collapsed = false,
  mobile = false,
  onNavigate,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
  });

  const createChat = useMutation({
    mutationFn: () => conversationsApi.create(),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${conv.id}`);
      onNavigate?.();
    },
    onError: (err: unknown) => {
      console.error('Failed to create chat:', toErrorMessage(err));
    },
  });

  const groups = groupByDate(conversations);
  const activeChatId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null;
  const accountLabel = user?.displayName || user?.email || 'Account';
  const accountInitial = accountLabel.slice(0, 1).toUpperCase();

  return (
    <aside
      className={`glass flex h-full flex-col overflow-hidden rounded-2xl transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      <div className={`flex gap-2 p-3 ${collapsed ? 'flex-col' : 'items-center'}`}>
        <button
          type="button"
          onClick={() => createChat.mutate()}
          disabled={createChat.isPending}
          title={collapsed ? 'New chat' : undefined}
          aria-label={collapsed ? 'New chat' : undefined}
          className={`glass-pill flex h-11 items-center rounded-xl text-sm text-white/90 transition-all hover:bg-white/10 disabled:opacity-50 ${
            collapsed ? 'w-11 justify-center' : 'flex-1 gap-2.5 px-3'
          }`}
        >
          <Plus size={16} />
          {!collapsed && <span>{createChat.isPending ? 'Starting...' : 'New chat'}</span>}
        </button>
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-all hover:bg-white/5 hover:text-white"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-2.5'}`}>
        {!collapsed && (
          <>
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Chats
              </span>
              {!isLoading && (
                <span className="text-[11px] tabular-nums text-muted">{conversations.length}</span>
              )}
            </div>

            {isLoading && (
              <div className="space-y-2 px-2">
                <div className="h-9 animate-pulse rounded-xl bg-white/5" />
                <div className="h-9 animate-pulse rounded-xl bg-white/5" />
                <div className="h-9 animate-pulse rounded-xl bg-white/5" />
              </div>
            )}

            {!isLoading && groups.length === 0 && (
              <p className="px-3 py-4 text-xs leading-5 text-muted">
                Your conversations will appear here.
              </p>
            )}

            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-3 py-1.5 text-xs text-muted">{group.label}</div>
                {group.items.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    onClick={onNavigate}
                    title={conv.title}
                    className={`mb-1 block truncate rounded-xl px-3 py-2.5 text-sm transition-all ${
                      activeChatId === conv.id
                        ? 'glass-nav-active text-white'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {conv.title}
                  </Link>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-white/10 p-2">
        <SidebarLink
          active={pathname.startsWith('/documents')}
          collapsed={collapsed}
          href="/documents"
          icon={FileText}
          label="Documents"
          onNavigate={onNavigate}
        />
        <SidebarLink
          active={pathname === '/settings'}
          collapsed={collapsed}
          href="/settings"
          icon={Settings}
          label="Settings"
          onNavigate={onNavigate}
        />
        <SidebarLink
          active={pathname === '/settings/usage'}
          collapsed={collapsed}
          href="/settings/usage"
          icon={BarChart3}
          label="Usage"
          onNavigate={onNavigate}
        />
        <div
          className={`mt-2 flex h-11 items-center rounded-xl ${
            collapsed ? 'justify-center' : 'gap-2 px-2'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-medium text-white/90">
            {accountInitial}
          </div>
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{user?.email}</span>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            className={`text-muted transition-colors hover:text-white ${
              collapsed ? 'hidden' : 'flex h-8 w-8 items-center justify-center'
            }`}
          >
            <LogOut size={16} />
          </button>
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-10 w-full items-center justify-center rounded-xl text-muted transition-all hover:bg-white/5 hover:text-white"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen gap-2 overflow-hidden bg-black p-2 md:gap-3 md:p-3">
      <div className="hidden shrink-0 md:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-2 top-2 bottom-2">
            <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-1 pb-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="glass-pill rounded-xl p-2 text-muted transition-colors hover:text-white"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-white/90">Knowledge Base</span>
        </div>
        {children}
      </div>
    </div>
  );
}
