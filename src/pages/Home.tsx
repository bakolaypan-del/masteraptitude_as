import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Keyboard, FileText, ArrowRight, BookOpen, Star, Users, Trophy, LogIn } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { motion } from 'motion/react';

export default function Home() {
  const { user } = useAuth();

  const publicLinks = [
    { label: 'Home', href: '#' },
    { label: 'About', href: '#' },
    { label: 'Courses', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  const features = [
    {
      title: 'Mock Tests',
      description: 'Prepare with full-length adaptive tests to measure your aptitude.',
      icon: <FileText className="w-8 h-8 text-indigo-400" />,
      link: '/dashboard', // Links to dashboard where tests are
    },
    {
      title: 'Typing Tests',
      description: 'Enhance your speed and accuracy with our advanced typing modules.',
      icon: <Keyboard className="w-8 h-8 text-fuchsia-400" />,
      link: '/typing-test',
    },
    {
      title: 'Learn Dashboard',
      description: 'Access premium learning materials and track your daily progress.',
      icon: <BookOpen className="w-8 h-8 text-amber-400" />,
      link: '/dashboard',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.05),transparent_50%)] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform -rotate-6">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent uppercase tracking-tight">
                Master Aptitude
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {publicLinks.map((link) => (
                <a key={link.label} href={link.href} className="text-sm font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold text-white uppercase tracking-wider transition-all flex items-center gap-2">
                  Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/login" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-900/30 text-sm font-bold text-white uppercase tracking-wider transition-all flex items-center gap-2">
                  <LogIn size={16} /> Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest mb-8"
            >
              <Star size={14} className="text-amber-400" /> Premium Learning Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[1.1]"
            >
              Elevate Your Potential With <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Master Aptitude</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium"
            >
              Comprehensive mock tests, advanced typing modules, and expert-curated learning materials designed to help you ace your exams.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to="/dashboard" className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-xl shadow-indigo-900/30 text-sm font-bold text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                Get Started Now <ArrowRight size={18} />
              </Link>
              <a href="#features" className="px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-all flex items-center justify-center">
                Explore Features
              </a>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 bg-slate-900/50 border-t border-slate-800/50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Our Premium Offerings</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Access industry-leading tools to maximize your preparation.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 mb-8">{feature.description}</p>

                  <Link
                    to={feature.link}
                    className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest gap-2"
                  >
                    Access Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-24 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-800/50">
              <div className="text-center px-4">
                <div className="flex justify-center mb-4"><Users className="w-8 h-8 text-slate-500" /></div>
                <div className="text-3xl font-black text-white mb-1">10,000+</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Students</div>
              </div>
              <div className="text-center px-4">
                <div className="flex justify-center mb-4"><FileText className="w-8 h-8 text-slate-500" /></div>
                <div className="text-3xl font-black text-white mb-1">500+</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mock Tests</div>
              </div>
              <div className="text-center px-4">
                <div className="flex justify-center mb-4"><Keyboard className="w-8 h-8 text-slate-500" /></div>
                <div className="text-3xl font-black text-white mb-1">1M+</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Words Typed</div>
              </div>
              <div className="text-center px-4">
                <div className="flex justify-center mb-4"><Trophy className="w-8 h-8 text-slate-500" /></div>
                <div className="text-3xl font-black text-white mb-1">98%</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Master Aptitude. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
