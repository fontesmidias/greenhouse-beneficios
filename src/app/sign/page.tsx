"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useEffect } from 'react';

function SignPortalContent() {
  const params = useSearchParams();
  const token = params.get('token');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
       const resizeCanvas = () => {
         const rect = canvas.parentElement?.getBoundingClientRect();
         if (rect) {
           canvas.width = rect.width;
           canvas.height = 200;
           clearCanvas();
         }
       };
       resizeCanvas();
       window.addEventListener('resize', resizeCanvas);
       return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#10b981"; // Emerald
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const submitSignature = async () => {
    if (!hasSignature || !token) return;
    
    setIsSubmitting(true);
    setFeedback(null);
    
    const signatureDataUrl = canvasRef.current?.toDataURL('image/png');
    
    try {
      const res = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature: signatureDataUrl })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro Crítico ao registrar assinatura');
      
      setFeedback({ type: 'success', text: 'Documento assinado com Sucesso! Um email com sua cópia autenticada foi enviado.' });
    } catch(err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedback && feedback.type === 'success') {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6">
        <div className="bg-[#121214] ring-1 ring-emerald-500/30 p-10 rounded-3xl max-w-lg w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden">
           <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
           <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/50">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
           </div>
           <h2 className="text-2xl font-bold tracking-tight text-emerald-400 mb-2">Assinatura Concluída</h2>
           <p className="text-zinc-400 text-sm leading-relaxed mb-6">Seu recibo foi criptografado com sucesso. A empresa foi notificada e uma cópia segura foi disparada para os seus contatos registrados.</p>
           <button onClick={() => window.close()} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors ring-1 ring-white/10">Fechar Janela</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="bg-[#121214] ring-1 ring-white/10 p-6 md:p-8 rounded-[2rem] max-w-4xl w-full text-center shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-8">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        
        {/* LEFT COLUMN: PDF Preview */}
        <div className="lg:w-1/2 flex flex-col items-start text-left shrink-0">
          <div className="mb-4">
             <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Crivo de Assinatura</h1>
             <p className="text-zinc-400 text-xs leading-relaxed">Verifique os dados do seu recibo oficial e conceda o seu aval assinando no quadro ao lado.</p>
          </div>
          
          <div className="w-full bg-[#0A0A0B] rounded-2xl ring-1 ring-white/10 overflow-hidden relative shadow-inner h-[400px] lg:h-[500px]">
             {token ? (
               <iframe 
                 src={`/api/pdf?token=${token}#toolbar=0&navpanes=0`} 
                 className="w-full h-full border-none object-contain"
                 title="Preview do Recibo"
               ></iframe>
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-mono text-xs">Acesso Negado</div>
             )}
          </div>
        </div>

        {/* RIGHT COLUMN: Canvas & Feedback */}
        <div className="lg:w-1/2 flex flex-col flex-1 justify-center">
          
          {feedback && feedback.type === 'error' && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-6 text-sm font-bold flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-left">{feedback.text}</span>
            </div>
          )}

          <div className="w-full relative rounded-2xl overflow-hidden bg-[#0A0A0B] ring-1 ring-white/10 mb-4 group touch-none shadow-inner h-[250px]">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-zinc-600">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                <span className="font-medium text-sm">Rubrique aqui com seu dedo ou mouse</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-8">
            <button onClick={clearCanvas} className="text-[11px] text-zinc-500 font-bold hover:text-white transition-colors uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg ring-1 ring-white/10">
              Limpar Quadro
            </button>
            <div className="text-[10px] font-mono text-emerald-500/50 bg-emerald-500/5 px-2 py-1 rounded-md flex gap-1.5 items-center ring-1 ring-emerald-500/10 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Conexão Segura
            </div>
          </div>

          <button 
            onClick={submitSignature} 
            disabled={!hasSignature || isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/20 disabled:text-emerald-500/50 disabled:cursor-not-allowed text-[#070708] font-bold py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2 mt-auto">
            {isSubmitting ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            )}
            {isSubmitting ? 'Registrando Criptografia...' : 'Autenticar Documento Oficial'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SignPortal() {
  return (
      <Suspense fallback={<div className="min-h-screen bg-[#070708] text-white flex items-center justify-center">Carregando Criptografia...</div>}>
         <SignPortalContent />
      </Suspense>
  );
}
