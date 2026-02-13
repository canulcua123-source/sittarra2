import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Bell, Heart, Star,
  ChevronRight, Settings, LogOut, Camera, Shield,
  Calendar, Check, X, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRestaurants } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserType } from '@/types';
import { favoriteService, uploadService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';


const ClientProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading, updateUser, logout: authLogout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserType>>({});
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Map URL tab parameters to internal tab values
  const tabMapping: Record<string, string> = {
    'info': 'info',
    'favoritos': 'favorites',
    'preferencias': 'preferences',
    'seguridad': 'security'
  };

  const urlTab = searchParams.get('tab') || 'info';
  const activeTab = tabMapping[urlTab] || 'info';

  const handleTabChange = (value: string) => {
    const reverseMapping: Record<string, string> = {
      'info': 'info',
      'favorites': 'favoritos',
      'preferences': 'preferencias',
      'security': 'seguridad'
    };
    setSearchParams({ tab: reverseMapping[value] || 'info' });
  };

  // Use a refined notification state that defaults to something sensible
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: true,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      });
      // Handle preferences if they exist in user object
      if (user.preferences) {
        setNotifications({
          ...notifications,
          ...user.preferences.notifications,
          marketing: user.preferences.notifications.marketing ?? notifications.marketing
        });
      }
    }
  }, [user]);

  // Fetch restaurants from API
  const { data: restaurants = [] } = useRestaurants();

  // State for favorites from API
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  // Fetch favorites from API
  useEffect(() => {
    const fetchFavorites = async () => {
      if (isAuthenticated) {
        try {
          const favorites = await favoriteService.getMyFavorites();
          const ids = favorites.map((f: any) => f.restaurant_id);
          setFavoriteIds(ids);
        } catch (error) {
          console.error('Error fetching favorites:', error);
        } finally {
          setFavoritesLoading(false);
        }
      } else {
        setFavoritesLoading(false);
      }
    };
    fetchFavorites();
  }, [isAuthenticated]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe pesar más de 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadService.uploadAvatar(file);

      if (result.success && result.url) {
        // Update local user state via context
        updateUser({ avatar: result.url });

        toast({
          title: "Foto actualizada",
          description: "Tu foto de perfil se ha actualizado correctamente",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la foto de perfil",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando perfil...</div>;
  }

  const favoriteRestaurantsList = restaurants.filter(r =>
    favoriteIds.includes(r.id)
  );

  const handleSave = () => {
    updateUser(formData);
    setIsEditing(false);
    // Success toast?
  };

  const handleLogout = () => {
    authLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-primary/20 to-background">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-center gap-8"
            >
              {/* Avatar Section */}
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-white shadow-elevated">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-3xl font-display bg-primary text-primary-foreground">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 bg-secondary text-secondary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 hover:cursor-pointer"
                  title="Cambiar foto de perfil"
                >
                  <Camera className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              {/* User Info */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-display font-bold mb-2">
                  {user.name}
                </h1>
                <p className="text-muted-foreground mb-4">
                  Miembro desde {new Date(user.createdAt || Date.now()).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <Badge variant="secondary" className="gap-2 px-4 py-2">
                    <Calendar className="w-4 h-4" />
                    {user.reservationsCount || 0} reservaciones
                  </Badge>
                  <Badge variant="outline" className="gap-2 px-4 py-2">
                    <Heart className="w-4 h-4" />
                    {favoriteIds.length} favoritos
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} className="gap-2">
                      <Check className="w-4 h-4" />
                      Guardar
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    Editar perfil
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div >

        {/* Main Content */}
        < div className="container mx-auto px-4 py-8" >
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            <TabsList className="grid grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="info" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Información</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Favoritos</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Preferencias</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Seguridad</span>
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
                  <h3 className="text-xl font-display font-semibold">Datos Personales</h3>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Nombre completo
                      </Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Correo electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-card rounded-2xl p-6 shadow-card">
                  <h3 className="text-xl font-display font-semibold mb-6">Restaurantes Favoritos</h3>

                  {favoriteRestaurantsList.length > 0 ? (
                    <div className="space-y-4">
                      {favoriteRestaurantsList.map((restaurant) => (
                        <Link
                          key={restaurant.id}
                          to={`/restaurante/${restaurant.id}`}
                          className="flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-muted transition-colors"
                        >
                          <img
                            src={restaurant.image}
                            alt={restaurant.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">{restaurant.name}</h4>
                            <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.zone}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 fill-warning text-warning" />
                              <span className="text-sm font-medium">{restaurant.rating}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        Aún no tienes restaurantes favoritos
                      </p>
                      <Button asChild className="mt-4">
                        <Link to="/restaurantes">Explorar restaurantes</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                {/* Notifications */}
                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-display font-semibold">Notificaciones</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">Notificaciones por email</p>
                        <p className="text-sm text-muted-foreground">Recibe confirmaciones y recordatorios</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">Notificaciones push</p>
                        <p className="text-sm text-muted-foreground">Alertas en tiempo real en tu dispositivo</p>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">SMS</p>
                        <p className="text-sm text-muted-foreground">Mensajes de texto para recordatorios importantes</p>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">Marketing y ofertas</p>
                        <p className="text-sm text-muted-foreground">Recibe promociones y descuentos exclusivos</p>
                      </div>
                      <Switch
                        checked={notifications.marketing}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Dining Preferences */}
                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-display font-semibold">Preferencias de Comida</h3>
                  </div>

                  <div className="grid gap-6">
                    <div>
                      <Label className="mb-2 block">Zona preferida</Label>
                      <select
                        value={user.preferences?.preferredZones?.[0] || 'Centro'}
                        onChange={(e) => updateUser({ preferences: { ...user.preferences, preferredZones: [e.target.value] } } as any)}
                        className="w-full px-4 py-3 rounded-lg border bg-background"
                      >
                        <option value="Centro">Centro</option>
                        <option value="Montejo">Montejo</option>
                        <option value="Norte">Norte</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Tipo de cocina favorita</Label>
                      <select
                        value={user.preferences?.preferredCuisines?.[0] || 'Yucateca'}
                        onChange={(e) => updateUser({ preferences: { ...user.preferences, preferredCuisines: [e.target.value] } } as any)}
                        className="w-full px-4 py-3 rounded-lg border bg-background"
                      >
                        <option value="Yucateca">Yucateca</option>
                        <option value="Mariscos">Mariscos</option>
                        <option value="Fusión">Fusión</option>
                        <option value="Internacional">Internacional</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
                  <h3 className="text-xl font-display font-semibold">Cambiar Contraseña</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Contraseña actual</Label>
                      <Input id="currentPassword" type="password" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nueva contraseña</Label>
                      <Input id="newPassword" type="password" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                      <Input id="confirmPassword" type="password" className="bg-background" />
                    </div>
                    <Button className="w-full">Actualizar contraseña</Button>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
                  <h3 className="text-xl font-display font-semibold text-destructive">Zona de Peligro</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div>
                        <p className="font-medium text-destructive">Cerrar sesión</p>
                        <p className="text-sm text-muted-foreground">Cierra tu sesión en este dispositivo</p>
                      </div>
                      <Button variant="destructive" size="sm" className="gap-2" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div>
                        <p className="font-medium text-destructive">Eliminar cuenta</p>
                        <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div >
      </main >

      <Footer />
    </div >
  );
};

export default ClientProfilePage;
