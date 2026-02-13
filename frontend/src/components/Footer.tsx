import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-foreground flex items-center justify-center">
                <span className="text-primary font-display text-xl">M</span>
              </div>
              <span className="font-display text-xl font-semibold">Sittara</span>
            </div>
            <p className="text-primary-foreground/80 mb-4 max-w-md">
              La mejor experiencia para reservar tu mesa en los restaurantes más exclusivos de Mérida, Yucatán.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><Link to="/restaurantes" className="hover:text-primary-foreground transition-colors">Restaurantes</Link></li>
              <li><Link to="/ofertas" className="hover:text-primary-foreground transition-colors">Ofertas</Link></li>
              <li><Link to="/mis-reservas" className="hover:text-primary-foreground transition-colors">Mis Reservas</Link></li>
              <li><Link to="/ayuda" className="hover:text-primary-foreground transition-colors">Ayuda</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-primary-foreground/80">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Mérida, Yucatán
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                +52 999 123 4567
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                hola@Sittara.com
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/20 text-center text-primary-foreground/60 text-sm">
          <p>© 2026 Sittara. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
