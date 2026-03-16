/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Copy, Check, RefreshCw, Instagram, Send, Info, Twitter, Linkedin, MessageCircle, Link2, Music2, Ghost, Eye, X, LogIn, LogOut, User as UserIcon, History } from 'lucide-react';
import { generateBios, GeneratedBio } from './services/gemini';
import { useAuth } from './contexts/AuthContext';
import { db, collection, addDoc, Timestamp, query, where, orderBy, onSnapshot } from './firebase';

const PLATFORMS = [
  { id: 'instagram', name: 'انستقرام', icon: Instagram, color: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'twitter', name: 'تويتر / X', icon: Twitter, color: 'bg-black' },
  { id: 'linkedin', name: 'لينكد إن', icon: Linkedin, color: 'bg-[#0077b5]' },
  { id: 'tiktok', name: 'تيك توك', icon: Music2, color: 'bg-black' },
  { id: 'snapchat', name: 'سناب شات', icon: Ghost, color: 'bg-[#fffc00]' },
  { id: 'linktree', name: 'لينك تري', icon: Link2, color: 'bg-[#43e660]' },
  { id: 'whatsapp', name: 'واتساب أعمال', icon: MessageCircle, color: 'bg-[#25d366]' },
];

const LANGUAGES = [
  { id: 'ar', name: 'العربية', flag: '🇸🇦' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [input, setInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('ar');
  const [loading, setLoading] = useState(false);
  const [bios, setBios] = useState<GeneratedBio[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [greeting, setGreeting] = useState<string>('');
  const [tip, setTip] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewBio, setPreviewBio] = useState<GeneratedBio | null>(null);

  // Fetch history if user is logged in
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'bios'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    }, (err) => {
      console.error("Firestore history error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    if (input.trim().length < 5) {
      setError('النص قصير جداً، يرجى كتابة المزيد من التفاصيل للحصول على نتائج أفضل.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await generateBios(
        input, 
        selectedPlatforms.map(id => PLATFORMS.find(p => p.id === id)?.name || id),
        selectedLanguage
      );
      setBios(response.bios);
      setGreeting(response.greeting);
      setTip(response.tip);

      // Save to Firestore if logged in
      if (user) {
        try {
          const savePromises = response.bios.map(bio => 
            addDoc(collection(db, 'bios'), {
              userId: user.uid,
              content: bio.content,
              style: bio.style,
              emoji: bio.emoji,
              platform: selectedPlatforms[0] || 'general',
              language: selectedLanguage,
              createdAt: Timestamp.now()
            })
          );
          await Promise.all(savePromises);
        } catch (saveErr) {
          console.error("Failed to save bios to history", saveErr);
        }
      }
    } catch (err: any) {
      if (err.message === 'EMPTY_RESPONSE') {
        setError('لم يتمكن الذكاء الاصطناعي من توليد نتائج. قد يكون النص المدخل غير واضح أو مخالف لسياسات المحتوى.');
      } else if (err.message === 'PARSE_ERROR') {
        setError('حدث خطأ في معالجة البيانات المستلمة. يرجى المحاولة مرة أخرى.');
      } else if (err.message.includes('API key')) {
        setError('هناك مشكلة في إعدادات الخدمة (مفتاح API مفقود).');
      } else {
        setError('حدث خطأ غير متوقع. يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const PreviewModal = ({ bio }: { bio: GeneratedBio }) => {
    const platformId = selectedPlatforms[0] || 'instagram';
    const platform = PLATFORMS.find(p => p.id === platformId) || PLATFORMS[0];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setPreviewBio(null)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-[40px] w-full max-w-[320px] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Mockup Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">معاينة {platform.name}</h3>
            <button onClick={() => setPreviewBio(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Platform Mockup Content */}
          <div className="p-6 bg-white">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-20 h-20 rounded-full p-1 bg-gradient-to-tr ${platform.id === 'instagram' ? platform.color : 'from-zinc-200 to-zinc-300'}`}>
                <div className="w-full h-full rounded-full bg-white p-1">
                  <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300">
                    <platform.icon size={32} />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-4 w-24 bg-zinc-100 rounded mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-8 flex-1 bg-zinc-100 rounded-lg"></div>
                  <div className="h-8 flex-1 bg-zinc-100 rounded-lg"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-sm">اسم المستخدم</div>
              <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {bio.content}
              </div>
              <div className="text-blue-600 text-sm font-medium">linktr.ee/username</div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-zinc-50 rounded-sm"></div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-emerald-100" dir="rtl">
      {/* Navigation / Auth */}
      <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-zinc-100 shadow-sm">
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-900 leading-none">{user.displayName}</p>
                <p className="text-[10px] text-zinc-500">{user.email}</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <UserIcon size={16} />
                </div>
              )}
              <button 
                onClick={logout}
                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm font-bold hover:bg-zinc-50 transition-all shadow-sm"
            >
              <LogIn size={18} />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>

        {user && (
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-full transition-all ${showHistory ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
            title="السجل"
          >
            <History size={20} />
          </button>
        )}
      </nav>

      {/* Header */}
      <header className="max-w-4xl mx-auto pt-12 pb-8 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium mb-4"
        >
          <Sparkles size={16} />
          <span>مدعوم بالذكاء الاصطناعي</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-zinc-900"
        >
          بايو حسابك فاضي؟
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-500 text-lg max-w-xl mx-auto"
        >
          اكتب نبذة عن نفسك، اهتماماتك، أو عملك، وسنقوم بإنشاء 4 خيارات مميزة لك.
        </motion.p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 md:p-8 mb-12"
        >
          {showHistory && user ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">سجل البايو الخاص بك</h3>
                <button onClick={() => setShowHistory(false)} className="text-sm text-emerald-600 font-bold">العودة للكتابة</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <div key={item.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <span className="text-sm font-bold text-zinc-700">{item.style}</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(item.content, idx + 100)}
                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-sm"
                        >
                          {copiedIndex === idx + 100 ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-zinc-400" />}
                        </button>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">{item.content}</p>
                      <div className="mt-2 text-[10px] text-zinc-400">
                        {item.createdAt?.toDate().toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>لا يوجد سجل حتى الآن</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <label className="block text-sm font-semibold text-zinc-700 mb-2">
              ماذا تريد أن يظهر في البايو الخاص بك؟
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثال: مصور فوتوغرافي، أحب السفر والقهوة، أعيش في الرياض..."
              className="w-full h-32 p-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none text-lg"
            />

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-700">
                اختر اللغة:
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                          : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-700">
                اختر المنصات (اختياري):
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                          : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-sm font-medium">{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                loading || !input.trim() 
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  جاري الكتابة...
                </>
              ) : (
                <>
                  <Send size={20} />
                  توليد البايو
                </>
              )}
            </button>
          </div>
          )}
          {error && (
            <p className="mt-4 text-red-500 text-sm text-center">{error}</p>
          )}
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {greeting && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 font-medium"
            >
              {greeting}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <AnimatePresence mode="popLayout">
            {bios.map((bio, index) => (
              <motion.div
                key={index}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white rounded-3xl border border-zinc-100 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{bio.emoji}</span>
                    <h3 className="font-bold text-zinc-800">{bio.style}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewBio(bio)}
                      className="p-2 rounded-xl bg-zinc-50 text-zinc-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="معاينة"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(bio.content, index)}
                      className="p-2 rounded-xl bg-zinc-50 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="نسخ"
                    >
                      {copiedIndex === index ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-4 min-h-[100px] flex items-center">
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap text-right w-full">
                    {bio.content}
                  </p>
                </div>
                {copiedIndex === index && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"
                  >
                    تم النسخ!
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {previewBio && <PreviewModal bio={previewBio} />}
        </AnimatePresence>

        <AnimatePresence>
          {tip && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 text-white p-6 rounded-3xl flex items-start gap-4"
            >
              <div className="p-2 bg-white/10 rounded-xl">
                <Info size={24} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold mb-1">نصيحة سريعة للصورة الشخصية:</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">{tip}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {bios.length === 0 && !loading && (
          <div className="text-center py-12 opacity-20">
            <Instagram size={64} className="mx-auto mb-4" />
            <p>بانتظار إبداعك...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-100 text-center">
        <span className="text-zinc-900 font-bold text-lg block mb-4">✦ OwnerAfaf ✦</span>
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a 
            href="https://www.instagram.com/ownerafaf/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#E4A5D0] transition-colors text-xs flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            ownerafaf@
          </a>
          <a 
            href="https://x.com/ownerafaf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#A990D4] transition-colors text-xs flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            ownerafaf@
          </a>
          <a 
            href="https://blogownerafaf.wordpress.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#2ECC71] transition-colors text-xs flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM2.007 12.279l5.274 14.44A10.019 10.019 0 012 12c0-.241.007-.481.007-.721zm9.993 9.938a9.974 9.974 0 01-2.832-.411l3.007-8.733 3.082 8.445a.956.956 0 00.073.142 9.984 9.984 0 01-3.33.557zm1.37-14.571c.599-.031 1.138-.094 1.138-.094.535-.063.472-.85-.063-.819 0 0-1.611.126-2.65.126-0.977 0-2.619-.126-2.619-.126-.536-.031-.599.787-.063.819 0 0 .507.063 1.044.094l1.55 4.248-2.177 6.527-3.622-10.775c.6-.031 1.138-.094 1.138-.094.535-.063.472-.85-.063-.819 0 0-1.611.126-2.65.126a18.6 18.6 0 01-.432-.008A10.003 10.003 0 0112 2c2.705 0 5.167 1.013 7.02 2.674a6.453 6.453 0 00-.41-.014c-.977 0-1.67.85-1.67 1.762 0 .819.472 1.511.976 2.33.378.662.819 1.511.819 2.738 0 .85-.326 1.836-.756 3.211l-.991 3.312-3.588-10.776z"/></svg>
            المدونة
          </a>
          <a 
            href="https://s.salla.sa/experts/service-provider/1744104089" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#00955d] transition-colors text-xs flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1zm-7-2l-4-4 1.41-1.41L12 13.17l5.59-5.58L19 9l-7 7z"/></svg>
            مزود خدمات سلة
          </a>
        </div>
        <p className="text-zinc-400 text-xs">
          خدمات التسويق / تصميم / وحلول الأعمال ·❥ ⍨ 🇸🇦
        </p>
      </footer>
    </div>
  );
}
