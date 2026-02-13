import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
    fps?: number;
    qrbox?: number;
}

const QRScanner = ({ onScanSuccess, onScanFailure, fps = 10, qrbox = 250 }: QRScannerProps) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 20, // Más frames para capturar mejor
                qrbox: { width: 280, height: 280 }, // Cuadro más grande
                aspectRatio: 1.0,
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true
            },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        };
    }, []);

    return (
        <div className="w-full overflow-hidden rounded-xl border-2 border-primary/20">
            <div id="reader"></div>
            <style>
                {`
                    #reader {
                        border: none !important;
                    }
                    #reader__scan_region {
                        background: #f8fafc;
                        display: flex;
                        justify-content: center;
                    }
                    #reader__dashboard_section_csr button {
                        padding: 8px 16px;
                        background-color: hsl(var(--primary));
                        color: hsl(var(--primary-foreground));
                        border-radius: var(--radius);
                        font-weight: 500;
                        border: none;
                        cursor: pointer;
                        margin: 10px 0;
                    }
                    #reader__dashboard_section_csr button:hover {
                        opacity: 0.9;
                    }
                    #reader video {
                        border-radius: var(--radius);
                        max-width: 100%;
                    }
                `}
            </style>
        </div>
    );
};

export default QRScanner;
