import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Mail, Lock, Eye, EyeOff, ChefHat, ArrowRight,
    Building2, Store, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { toast } from 'sonner';

const RestaurantLoginPage = () => {
    const navigate = useNavigate();
    const { login } = useRestaurantAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor ingresa tu email y contraseña');
            return;
        }

        setIsLoading(true);

        try {
            const success = await login(email, password);
            if (success) {
                toast.success('¡Bienvenido de vuelta!');
                navigate('/admin/dashboard');
            } else {
                setError('Credenciales inválidas. Por favor intenta de nuevo.');
                toast.error('Error al iniciar sesión');
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado');
            toast.error('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Left Side - Branding */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hidden lg:block text-center lg:text-left"
                >
                    <Link to="/" className="inline-flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-bold">Mesa Feliz</h1>
                            <p className="text-sm text-muted-foreground">Panel de Administración</p>
                        </div>
                    </Link>

                    <h2 className="text-4xl font-display font-bold mb-4">
                        Gestiona tu restaurante de manera inteligente
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Controla reservaciones, mesas, ofertas y analiza el rendimiento de tu negocio desde un solo lugar.
                    </p>

                    {/* Features */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Store className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Gestión en tiempo real</h4>
                                <p className="text-sm text-muted-foreground">Visualiza y controla tus mesas al instante</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft">
                            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-secondary" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Reportes y análisis</h4>
                                <p className="text-sm text-muted-foreground">Métricas para mejorar tu operación</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft">
                            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-warning" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Sugerencias de IA</h4>
                                <p className="text-sm text-muted-foreground">Recomendaciones inteligentes para tu negocio</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side - Login Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card rounded-3xl p-8 shadow-elevated"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                                <ChefHat className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-xl font-display font-bold">Mesa Feliz</h1>
                                <p className="text-xs text-muted-foreground">Panel de Administración</p>
                            </div>
                        </Link>
                    </div>

                    <Tabs defaultValue="login" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="register">Registro</TabsTrigger>
                        </TabsList>

                        {/* Login Tab */}
                        <TabsContent value="login">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-display font-bold">Bienvenido de vuelta</h2>
                                <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo electrónico</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="tu@restaurante.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="password">Contraseña</Label>
                                        <Link to="/admin/recuperar" className="text-sm text-primary hover:underline">
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                    />
                                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                        Recordarme en este dispositivo
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full gap-2"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        <>
                                            Iniciar Sesión
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </TabsContent>

                        {/* Register Tab */}
                        <TabsContent value="register">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-display font-bold">Registra tu restaurante</h2>
                                <p className="text-muted-foreground">Comienza a recibir reservas en minutos</p>
                            </div>

                            <form className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="restaurant-name">Nombre del restaurante</Label>
                                    <Input id="restaurant-name" placeholder="Mi Restaurante" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="manager-name">Nombre del gerente</Label>
                                    <Input id="manager-name" placeholder="Juan Pérez" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="register-email">Correo electrónico</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="register-email"
                                            type="email"
                                            placeholder="tu@restaurante.com"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="register-password">Contraseña</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="register-password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Checkbox id="terms" className="mt-1" />
                                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                                        Acepto los <Link to="/terminos" className="text-primary hover:underline">términos de servicio</Link> y la <Link to="/privacidad" className="text-primary hover:underline">política de privacidad</Link>
                                    </Label>
                                </div>

                                <Button type="submit" className="w-full gap-2" size="lg">
                                    Crear cuenta
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t text-center">
                        <p className="text-sm text-muted-foreground">
                            ¿Eres cliente? <Link to="/" className="text-primary hover:underline">Volver al sitio principal</Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RestaurantLoginPage;
