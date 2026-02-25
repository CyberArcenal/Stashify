// src/components/Shared/PageNotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    Home,
    Search,
    RefreshCw,
    ArrowLeft,
    Compass,
    Package,
    ShoppingCart,
    Layers
} from 'lucide-react';

const PageNotFound: React.FC = () => {
    // Common navigation paths
    const quickLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: Home, color: 'var(--accent-blue)' },
        { path: '/products', label: 'Products', icon: Package, color: 'var(--accent-green)' },
        { path: '/orders', label: 'Orders', icon: ShoppingCart, color: 'var(--accent-purple)' },
        { path: '/stock-items', label: 'Inventory', icon: Layers, color: 'var(--accent-orange)' },
    ];

    const handleGoBack = () => {
        window.history.back();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--card-bg)' }}>
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full" style={{ background: 'var(--accent-blue)', filter: 'blur(60px)' }}></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full" style={{ background: 'var(--accent-purple)', filter: 'blur(60px)' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full" style={{ background: 'var(--accent-green)', filter: 'blur(60px)' }}></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl w-full">
                {/* Error Code Display */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="text-9xl font-bold tracking-tighter" style={{ color: 'var(--primary-color)' }}>
                            4<span className="relative">
                                0
                                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping" style={{ background: 'var(--accent-yellow)' }}></div>
                            </span>4
                        </div>
                        <div className="absolute -top-6 -right-6 animate-bounce">
                            <AlertTriangle className="w-12 h-12" style={{ color: 'var(--accent-yellow)' }} />
                        </div>
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-widest uppercase letter-spacing-2" style={{ color: 'var(--text-secondary)' }}>
                        Page Not Found
                    </div>
                </div>

                {/* Error Message Card */}
                <div className="compact-card rounded-2xl p-8 mb-8 text-center transition-all duration-300 ease-in-out transform hover:scale-[1.01] hover:shadow-2xl" style={{
                    background: 'var(--card-secondary-bg)',
                    border: '1px solid var(--border-color)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <Compass className="w-16 h-16 mx-auto mb-6" style={{ color: 'var(--primary-color)' }} />

                    <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--sidebar-text)' }}>
                        Oops! We've Lost Our Way
                    </h1>

                    <p className="text-base mb-6 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        The page you're looking for seems to have wandered off into the digital wilderness.
                        It might have been moved, deleted, or perhaps it never existed in our inventory system.
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <Search className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        <code className="text-sm font-mono" style={{ color: 'var(--sidebar-text)' }}>
                            {window.location.pathname}
                        </code>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="compact-card rounded-2xl p-6 mb-8 transition-all duration-300 ease-in-out" style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)'
                }}>
                    <h2 className="text-lg font-semibold mb-6 text-center flex items-center justify-center gap-2" style={{ color: 'var(--sidebar-text)' }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-green)' }}></div>
                        Quick Navigation
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-green)' }}></div>
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickLinks.map((link, index) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={index}
                                    to={link.path}
                                    className="group flex flex-col items-center p-4 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
                                    style={{
                                        background: 'var(--card-secondary-bg)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <div className="p-3 rounded-full mb-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-12" style={{ background: link.color + '20' }}>
                                        <Icon className="w-6 h-6" style={{ color: link.color }} />
                                    </div>
                                    <span className="text-sm font-medium" style={{ color: 'var(--sidebar-text)' }}>{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleGoBack}
                        className="btn btn-secondary px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg group"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" style={{ color: 'var(--sidebar-text)' }} />
                        <span style={{ color: 'var(--sidebar-text)' }}>Go Back</span>
                    </button>

                    <Link
                        to="/dashboard"
                        className="btn btn-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg group"
                        style={{
                            background: 'var(--primary-color)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" style={{ color: 'var(--sidebar-text)' }} />
                        <span style={{ color: 'var(--sidebar-text)' }}>Go to Dashboard</span>
                    </Link>

                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-outline px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg group"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" style={{ color: 'var(--sidebar-text)' }} />
                        <span style={{ color: 'var(--sidebar-text)' }}>Refresh Page</span>
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-8 text-center">
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Still lost? Contact support if you believe this is an error
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-green)' }}></div>
                            Error Code: 404
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)' }}></div>
                            Timestamp: {new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageNotFound;