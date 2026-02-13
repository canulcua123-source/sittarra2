import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, User, Calendar, Search, LogOut, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isHome = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHome ? 'bg-transparent' : 'bg-card/95 backdrop-blur-md shadow-soft'
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-xl">M</span>
            </div>
            <span className={`font-display text-xl font-semibold ${isHome ? 'text-card' : 'text-foreground'}`}>
              Sittara
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/restaurantes"
              className={`font-medium transition-colors hover:text-primary ${isHome ? 'text-card/90 hover:text-card' : 'text-foreground'
                }`}
            >
              Restaurantes
            </Link>
            <Link
              to="/ofertas"
              className={`font-medium transition-colors hover:text-primary ${isHome ? 'text-card/90 hover:text-card' : 'text-foreground'
                }`}
            >
              Ofertas
            </Link>
            <Link
              to="/mis-reservas"
              className={`font-medium transition-colors hover:text-primary ${isHome ? 'text-card/90 hover:text-card' : 'text-foreground'
                }`}
            >
              Mis Reservas
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant={isHome ? 'outline' : 'ghost'} size="icon" className={isHome ? 'border-card/30 text-card hover:bg-card/10' : ''}>
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={isHome ? 'secondary' : 'default'} className="gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="max-w-24 truncate">
                      {user?.name ? user.name.split(' ')[0] : 'Usuario'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/perfil')} className="gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/mis-reservas')} className="gap-2 cursor-pointer">
                    <Calendar className="w-4 h-4" />
                    Mis Reservas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/perfil?tab=favoritos')} className="gap-2 cursor-pointer">
                    <Heart className="w-4 h-4" />
                    Favoritos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/perfil?tab=preferencias')} className="gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Preferencias
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant={isHome ? 'secondary' : 'default'}
                onClick={() => navigate('/login')}
              >
                <User className="h-4 w-4 mr-2" />
                Iniciar Sesión
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className={`h-6 w-6 ${isHome ? 'text-card' : 'text-foreground'}`} />
            ) : (
              <Menu className={`h-6 w-6 ${isHome ? 'text-card' : 'text-foreground'}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card rounded-2xl mb-4 p-6 shadow-elevated"
          >
            <nav className="flex flex-col gap-4">
              {isAuthenticated && user && (
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
              <Link to="/restaurantes" className="font-medium text-foreground py-2" onClick={() => setIsMenuOpen(false)}>
                Restaurantes
              </Link>
              <Link to="/ofertas" className="font-medium text-foreground py-2" onClick={() => setIsMenuOpen(false)}>
                Ofertas
              </Link>
              <Link to="/mis-reservas" className="font-medium text-foreground py-2" onClick={() => setIsMenuOpen(false)}>
                Mis Reservas
              </Link>

              {isAuthenticated ? (
                <>
                  <Link to="/perfil" className="font-medium text-foreground py-2" onClick={() => setIsMenuOpen(false)}>
                    Mi Perfil
                  </Link>
                  <Button variant="outline" className="mt-2" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <Button className="mt-4" onClick={() => { navigate('/login'); setIsMenuOpen(false); }}>
                  <User className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
              )}
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;

