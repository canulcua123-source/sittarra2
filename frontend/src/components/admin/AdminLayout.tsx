import { useState, ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Calendar, Grid3X3, Users,
    Tag, UtensilsCrossed, Star, BarChart3, Sparkles, Settings,
    ChevronLeft, ChevronRight, Menu, X, Bell, LogOut, ChefHat,
    User, HelpCircle, Moon, Sun, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { useUnreadNotifications, useMarkNotificationRead, useDashboardMetrics } from '@/hooks/useData';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminLayoutProps {
    children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, restaurant, logout } = useRestaurantAuth();

    // Data hooks
    const { data: notificationsData, refetch: refetchNotifications } = useUnreadNotifications();
    const { mutate: markAsRead } = useMarkNotificationRead();
    const { data: metrics } = useDashboardMetrics(restaurant?.id);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    const unreadCount = notificationsData?.unreadCount || 0;
    const notifications = notificationsData?.data || [];

    // Define menu items
    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        {
            icon: Calendar,
            label: 'Reservas',
            path: '/admin/reservas',
            badge: metrics?.pendingConfirmations ? String(metrics.pendingConfirmations) : undefined
        },
        { icon: Grid3X3, label: 'Mapa de Mesas', path: '/admin/mesas' },
        { icon: Users, label: 'Registro Llegada', path: '/admin/llegadas' },
        { icon: Tag, label: 'Ofertas', path: '/admin/ofertas' },
        { icon: UtensilsCrossed, label: 'Menú Digital', path: '/admin/menu' },
        { icon: Star, label: 'Opiniones', path: '/admin/opiniones' },
        { icon: BarChart3, label: 'Reportes', path: '/admin/reportes' },
        { icon: Sparkles, label: 'IA Sugerencias', path: '/admin/ia-sugerencias' },
        { icon: Settings, label: 'Configuración', path: '/admin/configuracion' },
    ];

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        toast.info('Sesión cerrada correctamente');
        navigate('/admin/login');
    };

    const handleHelp = () => {
        toast('Centro de Ayuda', {
            description: '¿Necesitas asistencia? Contáctanos en soporte@mesafeliz.com o visita nuestra guía rápida.',
            action: {
                label: 'Guía',
            },
        });
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    'hidden lg:flex flex-col fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-50 transition-all duration-300',
                    isCollapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Logo */}
                <div className="p-4 border-b border-sidebar-border">
                    <Link to="/admin/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
                            <ChefHat className="w-6 h-6 text-sidebar-primary-foreground" />
                        </div>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden"
                                >
                                    <h1 className="text-lg font-display font-bold whitespace-nowrap">Sittara</h1>
                                    <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                'hover:bg-sidebar-accent',
                                isActive(item.path) && 'bg-sidebar-accent'
                            )}
                        >
                            <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive(item.path) && 'text-sidebar-ring')} />
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="flex-1 whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {item.badge && !isCollapsed && (
                                <Badge className="bg-sidebar-ring text-sidebar-primary-foreground text-xs">
                                    {item.badge}
                                </Badge>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Collapse Button */}
                <div className="p-4 border-t border-sidebar-border">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </Button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween' }}
                            className="fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 lg:hidden"
                        >
                            {/* Mobile Header */}
                            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
                                        <ChefHat className="w-6 h-6 text-sidebar-primary-foreground" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-display font-bold">Sittara</h1>
                                        <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="text-sidebar-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="py-4 px-2 space-y-1">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                            'hover:bg-sidebar-accent',
                                            isActive(item.path) && 'bg-sidebar-accent'
                                        )}
                                    >
                                        <item.icon className={cn('w-5 h-5', isActive(item.path) && 'text-sidebar-ring')} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <Badge className="bg-sidebar-ring text-sidebar-primary-foreground text-xs">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </Link>
                                ))}
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className={cn('flex-1 flex flex-col transition-all duration-300', isCollapsed ? 'lg:ml-20' : 'lg:ml-64')}>
                {/* Top Header */}
                <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
                    <div className="flex items-center justify-between px-4 py-3">
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setIsMobileOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        {/* Breadcrumb - Desktop only */}
                        <div className="hidden lg:flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Panel</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                                {menuItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                            </span>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Theme Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDarkMode(!isDarkMode)}
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </Button>

                            {/* Help */}
                            <Button variant="ghost" size="icon" onClick={handleHelp}>
                                <HelpCircle className="w-5 h-5" />
                            </Button>

                            {/* Notifications */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80">
                                    <div className="p-3 border-b flex items-center justify-between">
                                        <h3 className="font-semibold">Notificaciones</h3>
                                        {unreadCount > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {unreadCount} nuevas
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.map((notif) => (
                                            <div key={notif.id} className="px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0 relative group">
                                                <div className="flex gap-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.unread ? 'bg-primary' : 'bg-transparent'}`} />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm font-medium leading-none">{notif.title}</p>
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                                                        <p className="text-[10px] text-muted-foreground/80">{notif.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="gap-2 px-2 hover:bg-accent transition-colors">
                                        <Avatar className="w-8 h-8 border">
                                            <AvatarImage src={user?.avatar || ""} />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                                {user?.name?.substring(0, 2).toUpperCase() || "AD"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="hidden md:flex flex-col items-start gap-0.5">
                                            <span className="text-sm font-bold leading-none">{user?.name || "Administrador"}</span>
                                            <span className="text-[10px] text-muted-foreground leading-none">{restaurant?.name || "Cargando..."}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-2">
                                    <div className="p-3 bg-muted/40 rounded-lg mb-2">
                                        <p className="font-bold text-sm tracking-tight">{user?.name}</p>
                                        <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
                                        <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-widest">{restaurant?.cuisine || 'Staff'}</Badge>
                                    </div>
                                    <Link to="/admin/configuracion">
                                        <DropdownMenuItem className="gap-2 h-10 cursor-pointer">
                                            <User className="w-4 h-4 text-primary" />
                                            Mi Perfil (Ajustes)
                                        </DropdownMenuItem>
                                    </Link>
                                    <Link to="/admin/configuracion">
                                        <DropdownMenuItem className="gap-2 h-10 cursor-pointer">
                                            <Settings className="w-4 h-4 text-primary" />
                                            Configuración
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator className="my-2" />
                                    <DropdownMenuItem onClick={handleLogout} className="gap-2 h-10 text-destructive focus:text-destructive focus:bg-destructive/5 font-bold cursor-pointer transition-colors">
                                        <LogOut className="w-4 h-4" />
                                        Cerrar Sesión
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
