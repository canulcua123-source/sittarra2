import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, Utensils, Calendar, MapPin, Star, CheckCircle2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const backgroundImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1920',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920',
];

const ClientLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register } = useAuth();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentBg, setCurrentBg] = useState(0);

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register form state
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');


    // Get the redirect path from location state or default to home
    const from = (location.state as { from?: string })?.from || '/';

    // Background slideshow effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBg((prev) => (prev + 1) % backgroundImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login(loginEmail, loginPassword);

        if (result.success) {
            toast({
                title: '¡Bienvenido!',
                description: 'Has iniciado sesión correctamente',
            });
            navigate(from, { replace: true });
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Email o contraseña incorrectos',
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };



    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate fields first
        if (registerPassword !== registerConfirmPassword) {
            toast({
                title: 'Error',
                description: 'Las contraseñas no coinciden',
                variant: 'destructive',
            });
            return;
        }

        if (registerPassword.length < 6) {
            toast({
                title: 'Error',
                description: 'La contraseña debe tener al menos 6 caracteres',
                variant: 'destructive',
            });
            return;
        }



        // Email verified, proceed with registration
        setIsLoading(true);
        const result = await register(registerName, registerEmail, registerPhone, registerPassword);

        if (result.success) {
            toast({
                title: '¡Cuenta creada!',
                description: 'Tu cuenta ha sido creada exitosamente',
            });
            navigate(from, { replace: true });
        } else {
            toast({
                title: 'Error',
                description: result.error || 'El email ya está registrado',
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };

    const benefits = [
        { icon: Calendar, title: 'Reserva en segundos', description: 'Selecciona tu mesa favorita visualmente' },
        { icon: MapPin, title: 'Los mejores lugares', description: 'Restaurantes exclusivos de Mérida' },
        { icon: Star, title: 'Gana recompensas', description: 'Acumula reservas y obtén beneficios' },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left side - Dynamic Background & Benefits */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
                {/* Background Slideshow */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentBg}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 z-0"
                    >
                        <img
                            src={backgroundImages[currentBg]}
                            alt="Gastronomía Yucateca"
                            className="w-full h-full object-cover opacity-60"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30 z-10" />

                {/* Content */}
                <div className="relative z-20 w-full p-12 flex flex-col justify-between text-white">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link to="/" className="flex items-center gap-2 mb-12 group">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                                <Utensils className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-display font-bold tracking-tight">Sittara</span>
                        </Link>

                        <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
                            Descubre la <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400">
                                gastronomía yucateca
                            </span>
                        </h1>
                        <p className="text-xl text-white/80 mb-12 max-w-md font-light">
                            La plataforma premium para reservar en los mejores restaurantes de Mérida.
                        </p>
                    </motion.div>

                    <div className="space-y-8">
                        {benefits.map((benefit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className="flex items-start gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300">
                                    <benefit.icon className="w-6 h-6 text-amber-200" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{benefit.title}</h3>
                                    <p className="text-white/60 text-sm">{benefit.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-12 text-sm text-white/40"
                    >
                        © 2024 Sittara. Todos los derechos reservados.
                    </motion.div>
                </div>
            </div>

            {/* Right side - Login/Register Form */}
            <div className="flex-1 flex flex-col bg-background relative z-30">
                <div className="p-4">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-md"
                    >
                        <div className="text-center mb-8 lg:hidden">
                            <Link to="/" className="inline-flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                    <Utensils className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <span className="text-2xl font-display font-bold">Sittara</span>
                            </Link>
                        </div>

                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50 rounded-xl">
                                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Iniciar Sesión</TabsTrigger>
                                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Registrarse</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-display font-bold mb-2">¡Bienvenido de vuelta!</h2>
                                        <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Correo electrónico</Label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="tu@email.com"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-muted/30 border-input group-focus-within:ring-2 group-focus-within:ring-primary/20"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Contraseña</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 bg-muted/30 border-input group-focus-within:ring-2 group-focus-within:ring-primary/20"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                                <input type="checkbox" className="rounded border-muted-foreground rounded-sm" />
                                                <span>Recordarme</span>
                                            </label>
                                            <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                                                ¿Olvidaste tu contraseña?
                                            </a>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold"
                                            size="lg"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                                        </Button>
                                    </form>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">
                                                O continúa con
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" className="h-10 hover:bg-slate-50">
                                            Google
                                        </Button>
                                        <Button variant="outline" className="h-10 hover:bg-slate-50">
                                            Facebook
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="register">
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-display font-bold mb-2">Crear nueva cuenta</h2>
                                        <p className="text-muted-foreground">Únete hoy y disfruta de beneficios exclusivos</p>
                                    </div>

                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="name">Nombre completo</Label>
                                                <div className="relative group">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        id="name"
                                                        type="text"
                                                        placeholder="Juan García"
                                                        value={registerName}
                                                        onChange={(e) => setRegisterName(e.target.value)}
                                                        className="pl-10 h-11 bg-muted/30"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reg-email">Correo electrónico</Label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="reg-email"
                                                    type="email"
                                                    placeholder="tu@email.com"
                                                    value={registerEmail}
                                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-muted/30"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Teléfono</Label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder="+52 999 123 4567"
                                                    value={registerPhone}
                                                    onChange={(e) => setRegisterPhone(e.target.value)}
                                                    className="pl-10 h-11 bg-muted/30"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reg-password">Contraseña</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="reg-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Mínimo 6 caracteres"
                                                    value={registerPassword}
                                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                                    className="pl-10 h-11 bg-muted/30"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    id="confirm-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Repite tu contraseña"
                                                    value={registerConfirmPassword}
                                                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                                    className="pl-10 h-11 bg-muted/30"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2 text-sm mt-4">
                                            <input type="checkbox" className="rounded border-muted-foreground mt-1" required />
                                            <span className="text-muted-foreground text-xs leading-relaxed">
                                                Acepto los <a href="#" className="text-primary hover:underline font-medium">términos de servicio</a> y la <a href="#" className="text-primary hover:underline font-medium">política de privacidad</a> de Sittara.
                                            </span>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold"
                                            size="lg"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                                        </Button>
                                    </form>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </div >

            {/* Email Verification Modal Removed */}
        </div >
    );
};

export default ClientLoginPage;
