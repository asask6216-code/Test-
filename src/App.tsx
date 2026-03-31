import { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, ShoppingCart, Trash2, Gift, Zap, MessageCircle, Send, Search, User, MapPin, Phone, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { products, categories, Product } from './constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Toaster, toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      toast('هل ترغب بتثبيت تطبيق Royal Silver؟', {
        action: {
          label: 'تثبيت',
          onClick: () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
              }
              setDeferredPrompt(null);
            });
          },
        },
      });
    });
  }, [deferredPrompt]);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [cart, setCart] = useState<{product: Product, size: string, modifiers: string[]}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'أهلاً بك في لومينا! كيف يمكنني مساعدتك اليوم؟'}]);
  const [aiInput, setAiInput] = useState('');
  const [checkout, setCheckout] = useState({ name: '', phone: '', street: '', house: '', branch: '', notes: '' });
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'product'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const filteredProducts = useMemo(() => 
    selectedCategory === "الكل" ? products : products.filter(p => p.category === selectedCategory),
  [selectedCategory]);

  const addToCart = (product: Product, size: string, modifiers: string[]) => {
    setCart([...cart, { product, size, modifiers }]);
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedModifiers([]);
    toast.success(`تمت إضافة ${product.name} إلى السلة!`, {
      style: { background: 'var(--primary-color)', color: 'black', border: 'none' }
    });
  };

  const sendToAI = async () => {
    if (!aiInput.trim()) return;
    const userMessage = aiInput;
    setAiMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiInput('');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "أنتِ لومينا، مساعدة ذكية لمطعم برغر هيفين. مهمتكِ هي مساعدة الزبائن في اختيار الوجبات بناءً على ذوقهم. إذا سأل الزبون عن شيء حار، اقترحي له الزنجر. إذا كان جائعاً جداً، اقترحي له الوجبات العائلية. كوني ودودة وسريعة.",
        },
      });
      setAiMessages(prev => [...prev, { role: 'ai', text: response.text || 'تفضل، كيف يمكنني مساعدتك؟' }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'عذراً، حدث خطأ.' }]);
    }
  };

  const generateWhatsAppMessage = (cart: {product: Product, size: string, modifiers: string[]}[], userDetails: any) => {
    let message = `*طلب جديد من مطعم برغر هيفين* 🍔\n\n`;
    
    cart.forEach(item => {
      message += `*${item.product.name}* (قياس: ${item.size})\n`;
      if(item.modifiers.length > 0) message += `  - إضافات: ${item.modifiers.join(', ')}\n`;
      message += `  - السعر: ${item.product.price}\n`;
      message += `------------------\n`;
    });

    message += `\n*تفاصيل التوصيل:* \n`;
    message += `📍 العنوان: شارع ${userDetails.address}\n`;
    message += `📞 الهاتف: ${userDetails.phone}\n`;
    message += `\n*المجموع الكلي: ${cart.reduce((sum, item) => sum + parseInt(item.product.price.replace(/[^0-9]/g, '')), 0).toLocaleString()} د.ع*`;

    return encodeURIComponent(message);
  };

  const sendWhatsApp = () => {
    const message = generateWhatsAppMessage(cart, {
      address: `${checkout.street}، دار ${checkout.house}، فرع ${checkout.branch}`,
      phone: checkout.phone
    });
    window.open(`https://wa.me/9647730256160?text=${message}`, '_blank');
  };

  const downloadInvoice = async () => {
    const invoiceElement = document.createElement('div');
    invoiceElement.style.padding = '20px';
    invoiceElement.style.background = 'white';
    invoiceElement.style.color = 'black';
    invoiceElement.innerHTML = `
      <h1 style="font-size: 24px; margin-bottom: 10px;">Lumena Invoice</h1>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #ccc;">
            <th style="text-align: left;">Product</th>
            <th style="text-align: left;">Size</th>
            <th style="text-align: left;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
              <td>${item.product.name}</td>
              <td>${item.size}</td>
              <td>${item.product.price} IQD</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top: 20px; font-weight: bold;">Total: ${cart.reduce((sum, item) => sum + parseInt(item.product.price.replace(/[^0-9]/g, '')), 0).toLocaleString()} IQD</p>
    `;
    document.body.appendChild(invoiceElement);
    const canvas = await html2canvas(invoiceElement);
    document.body.removeChild(invoiceElement);
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF();
    doc.addImage(imgData, 'PNG', 10, 10, 180, 0);
    doc.save("invoice.pdf");
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'about':
        return (
          <div className="p-6">
            <h1 className="text-4xl font-serif mb-6">من نحن</h1>
            <video autoPlay muted loop playsInline className="w-full h-64 object-cover rounded-3xl mb-6"><source src="https://www.w3schools.com/howto/rain.mp4" type="video/mp4" /></video>
            <p className="text-lg text-[#888]">لومينا هي وجهتك الأولى للأناقة والفخامة. نحن نؤمن بأن كل قطعة تختارها تعبر عن شخصيتك.</p>
            <button onClick={() => setCurrentPage('home')} className="mt-6 text-[#C5A059]">العودة للرئيسية</button>
          </div>
        );
      default:
        return (
          <>
            <div className="p-6">
              <h1 className="text-5xl font-display mb-2 neon-text">مجموعتنا الفاخرة</h1>
              <div className="flex gap-2 overflow-x-auto pb-4">
                <button onClick={() => setSelectedCategory("الكل")} className={`px-6 py-2 rounded-full whitespace-nowrap border ${selectedCategory === "الكل" ? 'bg-var(--color-neon-blue) text-black' : 'bg-var(--color-bg-card)'}`}>الكل</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full whitespace-nowrap border ${selectedCategory === cat ? 'bg-var(--color-neon-blue) text-black' : 'bg-var(--color-bg-card)'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <motion.div key={product.id} onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }} className="bg-var(--color-bg-card) p-3 rounded-3xl shadow-lg cursor-pointer">
                  <img src={product.image} className="w-full h-48 object-cover rounded-2xl mb-3" />
                  <h2 className="font-bold text-sm mb-1">{product.name}</h2>
                  <p className="text-var(--color-neon-blue) font-bold mb-3">{product.price.toLocaleString()} د.ع</p>
                </motion.div>
              ))}
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-white pb-20 font-sans">
      <Toaster position="top-center" />
      <header className="p-6 flex justify-between items-center sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[var(--color-neon-blue)]">
        <div className="flex items-center gap-2 font-bold text-3xl text-[var(--color-neon-blue)] cursor-pointer neon-text" onClick={() => setCurrentPage('home')}><Sparkles /> لومينا</div>
        <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-[var(--color-bg-card)] rounded-full border border-[var(--color-neon-blue)] hover:neon-glow transition-all">
          <ShoppingCart size={24} className="text-[var(--color-neon-blue)]" />
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[var(--color-neon-purple)] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{cart.length}</span>}
        </button>
      </header>

      {renderPage()}

      {/* Corner Menu */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3">
        <button onClick={() => setCurrentPage('about')} className="p-4 bg-var(--color-bg-card) rounded-full text-var(--color-neon-blue) shadow-lg"><FileText size={20} /></button>
        <button onClick={() => setIsAIChatOpen(true)} className="p-4 bg-var(--color-bg-card) rounded-full text-var(--color-neon-blue) shadow-lg"><MessageCircle size={20} /></button>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-var(--color-bg-card) p-6 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-var(--color-neon-blue)">{selectedProduct.name}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-var(--color-bg-dark) rounded-full"><X size={20} /></button>
              </div>
              <p className="text-white text-2xl font-bold mb-6">{selectedProduct.price.toLocaleString()} د.ع</p>
              <div className="flex gap-3 mb-6">
                {selectedProduct.sizes.map(s => <button key={s} onClick={() => setSelectedSize(s)} className={`px-6 py-3 border rounded-2xl text-sm transition-all ${selectedSize === s ? 'bg-var(--color-neon-blue) text-black' : 'border-var(--color-neon-blue)'}`}>{s}</button>)}
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">إضافات</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.modifiers.map(m => (
                    <button key={m} onClick={() => setSelectedModifiers(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m])} className={`px-4 py-2 border rounded-xl text-sm ${selectedModifiers.includes(m) ? 'bg-var(--color-neon-blue) text-black' : 'border-var(--color-neon-blue)'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => addToCart(selectedProduct, selectedSize || selectedProduct.sizes[0], selectedModifiers)} className="w-full bg-var(--color-neon-blue) text-black py-4 rounded-2xl font-bold text-lg">أضف للسلة</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {isAIChatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 bg-[#0A0A0A] z-[100] p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif">مساعد لومينا الذكي</h2><button onClick={() => setIsAIChatOpen(false)}><X /></button></div>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-[#C5A059] text-black self-end' : 'bg-[#1A1A1A] text-[#E5E5E5] self-start'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="اسألني عن أي شيء..." className="flex-1 p-4 bg-[#1A1A1A] border border-[#333] rounded-xl" />
              <button onClick={sendToAI} className="p-4 bg-[#C5A059] text-black rounded-xl"><Send /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 bg-[#0A0A0A] z-[100] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif">السلة</h2><button onClick={() => setIsCartOpen(false)}><X /></button></div>
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center mb-4 border-b border-[#333] pb-4">
                <div><p className="font-bold">{item.product.name}</p><p className="text-xs text-[#888]">قياس: {item.size}</p></div>
                <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 /></button>
              </div>
            ))}
            <div className="space-y-4 mt-8">
              <input placeholder="الاسم" className="w-full p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, name: e.target.value})} />
              <input placeholder="الهاتف" className="w-full p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, phone: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="الشارع" className="p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, street: e.target.value})} />
                <input placeholder="الدار" className="p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, house: e.target.value})} />
                <input placeholder="الفرع" className="p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, branch: e.target.value})} />
              </div>
              <textarea placeholder="ملاحظات إضافية" className="w-full p-4 bg-[var(--card-bg)] border border-[#333] rounded-xl" onChange={e => setCheckout({...checkout, notes: e.target.value})} />
              <button onClick={sendWhatsApp} className="w-full bg-[#C5A059] text-black py-4 rounded-xl font-bold">تأكيد الطلب عبر واتساب</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
