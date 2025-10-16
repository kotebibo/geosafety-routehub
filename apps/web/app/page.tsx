'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  MapIcon, 
  Route, 
  UserCog, 
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  Navigation,
  CheckCircle,
  Zap,
  BarChart3,
  Globe,
  Smartphone
} from 'lucide-react';
import { DEPLOYMENT_CONFIG } from '@/config/features';

export default function HomePage() {
  const { user, userRole, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    companies: 0,
    inspectors: 0,
    routes: 0,
    inspections: 0
  });

  useEffect(() => {
    setMounted(true);
    // Animate stats
    const animateValue = (start: number, end: number, key: keyof typeof stats) => {
      const duration = 2000;
      const range = end - start;
      const startTime = Date.now();
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + range * progress);
        setStats(prev => ({ ...prev, [key]: value }));
        
        if (progress === 1) clearInterval(timer);
      }, 50);
    };

    setTimeout(() => {
      animateValue(0, 216, 'companies');
      animateValue(0, 12, 'inspectors');
      animateValue(0, 847, 'routes');
      animateValue(0, 3429, 'inspections');
    }, 500);
  }, []);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-4 text-gray-600 animate-pulse">იტვირთება...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userRole?.role === 'admin';
  const isDispatcher = userRole?.role === 'dispatcher';
  const isInspector = userRole?.role === 'inspector';

  const quickLinks = [
    { 
      href: '/companies', 
      label: 'კომპანიების მართვა', 
      icon: Building2, 
      color: 'from-blue-500 to-blue-600',
      description: '216+ კომპანია',
      show: isAdmin || isDispatcher 
    },
    { 
      href: '/inspectors', 
      label: 'ინსპექტორები', 
      icon: Users, 
      color: 'from-green-500 to-green-600',
      description: 'გუნდის მართვა',
      show: isAdmin || isDispatcher 
    },
    { 
      href: '/admin/assignments', 
      label: 'დანიშვნები', 
      icon: UserCog, 
      color: 'from-purple-500 to-purple-600',
      description: 'სამუშაოს განაწილება',
      show: isAdmin || isDispatcher 
    },
    { 
      href: '/routes/builder', 
      label: 'მარშრუტის შექმნა', 
      icon: MapIcon, 
      color: 'from-indigo-500 to-indigo-600',
      description: 'ოპტიმიზაცია',
      show: isAdmin || isDispatcher 
    },
    { 
      href: '/routes/manage', 
      label: 'მარშრუტების მართვა', 
      icon: Route, 
      color: 'from-orange-500 to-orange-600',
      description: 'ყველა მარშრუტი',
      show: isAdmin || isDispatcher 
    },
    { 
      href: '/inspector/routes', 
      label: 'ჩემი მარშრუტები', 
      icon: Navigation, 
      color: 'from-teal-500 to-teal-600',
      description: 'დღევანდელი გეგმა',
      show: isInspector 
    },
  ].filter(link => link.show);

  const features = [
    {
      icon: Shield,
      title: 'უსაფრთხოება',
      description: 'Row-Level Security და მონაცემთა სრული დაცვა'
    },
    {
      icon: Zap,
      title: 'სისწრაფე',
      description: 'ოპტიმიზებული მარშრუტები რეალურ დროში'
    },
    {
      icon: Globe,
      title: 'ორენოვანი',
      description: 'ქართული და ინგლისური ინტერფეისი'
    },
    {
      icon: Smartphone,
      title: 'მობილური',
      description: 'მუშაობს ნებისმიერ მოწყობილობაზე'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full mb-6">
              <Activity className="w-4 h-4 mr-2 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium text-blue-800">სისტემა აქტიურია</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
              {DEPLOYMENT_CONFIG.isSingleServiceMode 
                ? DEPLOYMENT_CONFIG.appNameFull 
                : 'GeoSafety RouteHub'}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-4 animate-fade-in animation-delay-200">
              მარშრუტების ოპტიმიზაციისა და მართვის პლატფორმა
            </p>
            
            {user && (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg animate-fade-in animation-delay-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700">გამარჯობა, <strong>{user.email}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.companies}</div>
            <div className="text-sm text-gray-600">კომპანიები</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-500" />
              <Activity className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.inspectors}</div>
            <div className="text-sm text-gray-600">ინსპექტორები</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Route className="w-8 h-8 text-purple-500" />
              <BarChart3 className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.routes}</div>
            <div className="text-sm text-gray-600">მარშრუტები</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-orange-500" />
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.inspections}</div>
            <div className="text-sm text-gray-600">ინსპექციები</div>
          </div>
        </div>

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">სწრაფი მოქმედებები</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                    style={{
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    <div className="relative p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${link.color} rounded-xl text-white shadow-lg`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transform group-hover:translate-x-2 transition-all duration-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-1 transition-colors duration-300">
                        {link.label}
                      </h3>
                      <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors duration-300">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">პლატფორმის უპირატესობები</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  style={{
                    animation: `fadeIn 0.5s ease-out ${index * 0.1 + 0.5}s both`
                  }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-4">
                    <Icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        {!user && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              მზად ხართ დასაწყებად?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              შეუერთდით ასობით კომპანიას, რომლებიც უკვე იყენებენ RouteHub-ს
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/login"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                შესვლა
              </Link>
              <Link
                href="/auth/register"
                className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transform hover:scale-105 transition-all duration-300"
              >
                რეგისტრაცია
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-600">
                © 2025 GeoSafety RouteHub. ყველა უფლება დაცულია.
              </p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                შესახებ
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                დოკუმენტაცია
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                მხარდაჭერა
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                კონტაქტი
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
