'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Menu, X, Plus, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';

const FINNHUB_API_KEY = 'ct7h7rpr01qm40dlrla0ct7h7rpr01qm40dlrlag'; 

export default function StockDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'MAIN' | 'GOAL' | 'WATCH' | 'SETTING'>('MAIN');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(1457.37); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [stocks, setStocks] = useState([{ ticker: 'AAPL', quantity: 10, avgPrice: 180, sl: 170, tp: 250, color: '#71717a', currentPrice: 0 }]);
  const [totalCashUSD, setTotalCashUSD] = useState(0);
  const [targetPortfolio, setTargetPortfolio] = useState([{ ticker: 'AAPL', ratio: 50 }, { ticker: 'CASH', ratio: 50 }]);
  const [watchlist, setWatchlist] = useState([{ ticker: 'NVDA', part: 450, full: 400, current: 0, color: '#16a34a' }]);

  const updateTickerColor = (ticker: string, newColor: string) => {
    setStocks(prev => prev.map(s => s.ticker === ticker ? { ...s, color: newColor } : s));
    setWatchlist(prev => prev.map(w => w.ticker === ticker ? { ...w, color: newColor } : w));
  };

  const fUSD = (v: number) => (Math.floor(v * 100) / 100).toFixed(2);
  const fKRWk = (v: number) => Math.floor(v / 1000).toLocaleString() + 'k';
  const fFullKRW = (v: number) => Math.floor(v).toLocaleString();

  const fetchInitialPrices = useCallback(async (currentStocks: any[]) => {
    const updated = await Promise.all(currentStocks.map(async (s) => {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c || data.pc || s.avgPrice; 
        return { ...s, currentPrice: price };
      } catch (e) { return { ...s, currentPrice: s.avgPrice }; }
    }));
    setStocks(updated);
  }, []);

  const updateRealTimeData = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStocks = [...stocks];
    for (let i = 0; i < newStocks.length; i++) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${newStocks[i].ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c || data.pc; 
        if (price) {
          newStocks[i] = { ...newStocks[i], currentPrice: price };
          setStocks([...newStocks]);
        }
        await new Promise(r => setTimeout(r, 1100)); 
      } catch (e) { console.error(e); }
    }
    setIsUpdating(false);
  }, [stocks, isUpdating]);

  useEffect(() => {
    const saved = localStorage.getItem('stockApp_vFinal_Fixed_Layout');
    if (saved) {
      const p = JSON.parse(saved);
      setStocks(p.stocks); setTotalCashUSD(p.cash); setTargetPortfolio(p.goal); setWatchlist(p.watch);
      fetchInitialPrices(p.stocks);
    }
    setIsLoaded(true);
  }, [fetchInitialPrices]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('stockApp_vFinal_Fixed_Layout', JSON.stringify({ stocks, cash: totalCashUSD, goal: targetPortfolio, watch: watchlist }));
  }, [stocks, totalCashUSD, targetPortfolio, watchlist, isLoaded]);

  const processedAssets = useMemo(() => {
    const stockItems = stocks.map(s => ({ ...s, totalUSD: s.quantity * (s.currentPrice || s.avgPrice), totalKRW: s.quantity * (s.currentPrice || s.avgPrice) * exchangeRate, isStock: true }));
    const cashItem = { ticker: 'CASH', totalUSD: totalCashUSD, totalKRW: totalCashUSD * exchangeRate, isStock: false, quantity: totalCashUSD, avgPrice: 0, currentPrice: 0, color: '#000' };
    const all = [...stockItems, cashItem];
    const totalUSD = all.reduce((acc, cur) => acc + cur.totalUSD, 0);
    const totalKRW = all.reduce((acc, cur) => acc + cur.totalKRW, 0);
    return { list: all.map(s => ({ ...s, ratio: totalUSD > 0 ? (s.totalUSD / totalUSD) * 100 : 0 })), totalUSD, totalKRW };
  }, [stocks, totalCashUSD, exchangeRate]);

  if (!isLoaded) return null;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative font-sans text-slate-900 pb-10 overflow-hidden">
      {activeTab === 'MAIN' && (
        <div className="p-3">
          <div className="flex justify-between items-center bg-[#0f172a] text-white px-5 py-4 rounded-[28px] shadow-xl mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/30">Total Balance</span>
                <button onClick={updateRealTimeData} className={`text-slate-500 ${isUpdating ? 'animate-spin' : ''}`}><RefreshCw size={10}/></button>
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter leading-none">₩ {fFullKRW(processedAssets.totalKRW)}</h2>
              <p className="text-slate-400 font-bold text-[9px] mt-1 tracking-tight">$ {fUSD(processedAssets.totalUSD)} <span className="text-slate-600">| ₩{exchangeRate.toFixed(1)}</span></p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-95 transition-all"><Menu size={20}/></button>
              <button onClick={() => { const val = prompt("CASH($)", totalCashUSD.toString()); if(val) setTotalCashUSD(Number(val)); }} className="bg-white text-[#0f172a] px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">CASH 수정</button>
            </div>
          </div>
          <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-1.5 mb-1.5 text-center uppercase tracking-tighter"><div>티커</div><div>비중</div><div>자산(k)</div><div>수량</div><div>평단</div><div className="text-right">현재가</div></div>
          <div className="space-y-0.5">
            {processedAssets.list.map((s, i) => (
              <div key={i} onClick={() => s.isStock && setSelectedStock(s)} className="grid grid-cols-6 h-9 items-center italic border-b border-slate-50 text-center active:bg-slate-50 transition-colors">
                <div className="font-black text-[11px] text-left truncate uppercase" style={{ color: s.color }}>{s.ticker}</div>
                <div className="font-bold text-slate-400 text-[9px]">{s.ratio.toFixed(1)}%</div>
                <div className="text-slate-900 text-[10px] font-black">{fKRWk(s.totalKRW)}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.quantity) : '-'}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.avgPrice) : '-'}</div>
                <div className={`text-right font-black text-[10px] ${s.isStock ? (s.currentPrice >= s.avgPrice ? 'text-red-500' : 'text-blue-500') : 'text-slate-900'}`}>{s.isStock ? (s.currentPrice === 0 ? '...' : fUSD(s.currentPrice)) : '-'}</div>
              </div>
            ))}
          </div>
          <div className="h-44 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={processedAssets.list} dataKey="ratio" isAnimationActive={false} innerRadius={40} outerRadius={60} paddingAngle={2} label={({ticker, ratio}: any) => `${ticker} ${ratio.toFixed(0)}%`} labelLine={false}>{processedAssets.list.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}</Pie></PieChart></ResponsiveContainer></div>
        </div>
      )}

      {activeTab === 'WATCH' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4 mt-1"><h1 className="font-black text-xl italic uppercase text-orange-500">Watchlist</h1><button onClick={() => setActiveTab('MAIN')} className="p-1.5 bg-slate-100 rounded-lg"><X size={20}/></button></div>
          <div className="grid grid-cols-5 text-[9px] font-black text-slate-400 border-b pb-1.5 mb-1.5 text-center uppercase tracking-tighter"><div>색상</div><div>티커</div><div>현재</div><div>1차</div><div>강력</div></div>
          {watchlist.map((w, i) => (
            <div key={i} className="grid grid-cols-5 h-11 items-center border-b border-slate-50 italic text-center">
              <input type="color" value={w.color} onChange={e => updateTickerColor(w.ticker, e.target.value)} className="w-5 h-5 rounded-full mx-auto border-none cursor-pointer" />
              <div className="font-black text-[11px]" style={{ color: w.color }}>{w.ticker}</div>
              <div className="font-black text-[9px] tracking-tighter">${fUSD(w.current)}</div>
              <input type="number" value={w.part} onChange={e => { const n = [...watchlist]; n[i].part = Number(e.target.value); setWatchlist(n); }} className="w-[85%] bg-slate-50 p-1 rounded font-bold text-center text-[9px] text-orange-500 mx-auto" />
              <input type="number" value={w.full} onChange={e => { const n = [...watchlist]; n[i].full = Number(e.target.value); setWatchlist(n); }} className="w-[85%] bg-slate-50 p-1 rounded font-bold text-center text-[9px] text-red-500 mx-auto" />
            </div>
          ))}
          <button onClick={() => setWatchlist([...watchlist, { ticker: 'NEW', part: 0, full: 0, current: 0, color: '#000' }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-200 flex justify-center mt-4 transition-all active:scale-95"><Plus size={18}/></button>
        </div>
      )}

      {activeTab === 'GOAL' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-1 mt-1"><h1 className="font-black text-xl italic uppercase text-blue-600">Goal</h1><button onClick={() => setActiveTab('MAIN')} className="p-1.5 bg-slate-100 rounded-lg"><X size={20}/></button></div>
          <div className="h-44 mb-4 transition-all"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={targetPortfolio} dataKey="ratio" isAnimationActive={false} innerRadius={40} outerRadius={60} paddingAngle={2} label={({ticker, ratio}: any) => `${ticker} ${ratio}%`} labelLine={false}>
              {targetPortfolio.map((t, i) => <Cell key={i} fill={stocks.find(s => s.ticker === t.ticker)?.color || (t.ticker === 'CASH' ? '#0f172a' : '#cbd5e1')} stroke="none" />)}
            </Pie></PieChart></ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 text-[9px] font-black text-slate-400 border-b pb-1.5 mb-1.5 text-center uppercase tracking-tighter"><div>색상</div><div>티커</div><div>목표(%)</div><div>금액($)</div></div>
          {targetPortfolio.map((t, i) => (
            <div key={i} className="grid grid-cols-4 h-11 items-center border-b border-slate-50 italic text-center text-[10px]">
              {t.ticker !== 'CASH' ? <input type="color" value={stocks.find(s => s.ticker === t.ticker)?.color || '#e2e8f0'} onChange={e => updateTickerColor(t.ticker, e.target.value)} className="w-5 h-5 rounded-full mx-auto border-none cursor-pointer" /> : <div></div>}
              <div className="font-black truncate">{t.ticker}</div>
              <input type="number" value={t.ratio} onChange={e => { const n = [...targetPortfolio]; n[i].ratio = Number(e.target.value); setTargetPortfolio(n); }} className="w-[85%] bg-slate-50 p-1 rounded-lg font-black text-center mx-auto" />
              <div className="font-black text-slate-900 tracking-tighter">${fUSD((processedAssets.totalUSD * t.ratio) / 100)}</div>
            </div>
          ))}
          <button onClick={() => setTargetPortfolio([...targetPortfolio, { ticker: 'NEW', ratio: 0 }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-[20px] text-slate-200 flex justify-center mt-4 transition-all active:scale-95"><Plus size={18}/></button>
        </div>
      )}

      {activeTab === 'SETTING' && (
        <div className="p-4 animate-in fade-in pb-32">
          <div className="flex justify-between items-center mb-5 mt-1"><h1 className="font-black text-xl italic uppercase text-slate-900">Setting</h1><button onClick={() => setActiveTab('MAIN')} className="p-1.5 bg-slate-100 rounded-lg"><X size={20}/></button></div>
          <div className="grid grid-cols-7 text-[7px] font-black text-slate-400 border-b pb-1.5 mb-1.5 text-center uppercase tracking-tighter"><div>색상</div><div>티커</div><div>수량</div><div>평단</div><div>손절</div><div>익절</div><div></div></div>
          {stocks.map((s, i) => (
            <div key={i} className="grid grid-cols-7 gap-1 items-center bg-slate-50 p-2 rounded-xl italic mb-2 transition-all">
              <input type="color" value={s.color} onChange={e => updateTickerColor(s.ticker, e.target.value)} className="w-4 h-4 rounded mx-auto border-none cursor-pointer shadow-sm" />
              <input value={s.ticker} onChange={e => { const n = [...stocks]; n[i].ticker = e.target.value.toUpperCase(); setStocks(n); }} className="text-[10px] font-black w-full text-center bg-transparent outline-none uppercase" />
              <input type="number" value={s.quantity} onChange={e => { const n = [...stocks]; n[i].quantity = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-white p-0.5 rounded font-bold shadow-sm" />
              <input type="number" value={s.avgPrice} onChange={e => { const n = [...stocks]; n[i].avgPrice = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-white p-0.5 rounded font-bold shadow-sm" />
              <input type="number" value={s.sl} onChange={e => { const n = [...stocks]; n[i].sl = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-red-50 text-red-600 p-0.5 rounded font-bold shadow-sm" />
              <input type="number" value={s.tp} onChange={e => { const n = [...stocks]; n[i].tp = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-blue-50 text-blue-700 p-0.5 rounded font-bold shadow-sm" />
              <button onClick={() => setStocks(stocks.filter((_, idx) => idx !== i))} className="text-slate-300 mx-auto active:text-red-500"><Trash2 size={12}/></button>
            </div>
          ))}
          <button onClick={() => setStocks([...stocks, { ticker: 'NEW', quantity: 0, avgPrice: 0, currentPrice: 0, sl: 0, tp: 0, color: '#000' }])} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-[20px] text-slate-200 flex justify-center mt-4 transition-all active:scale-95"><Plus size={18}/></button>
        </div>
      )}

      {isSidebarOpen && activeTab === 'MAIN' && (
        <div className="fixed inset-0 z-[60] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-[80%] bg-white flex flex-col h-full ml-auto shadow-2xl">
            <div className="p-8 flex justify-between items-center border-b font-black text-xl italic uppercase mt-4 tracking-widest text-slate-900 leading-none">Menu <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 bg-slate-100 rounded-lg"><X size={28}/></button></div>
            <div className="p-6 space-y-4">
              <button onClick={() => {setActiveTab('GOAL'); setIsSidebarOpen(false);}} className="w-full p-6 bg-blue-600 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase tracking-tighter active:scale-95 transition-all">Goal <ChevronRight/></button>
              <button onClick={() => {setActiveTab('WATCH'); setIsSidebarOpen(false);}} className="w-full p-6 bg-orange-500 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase tracking-tighter active:scale-95 transition-all">Watchlist <ChevronRight/></button>
              <button onClick={() => {setActiveTab('SETTING'); setIsSidebarOpen(false);}} className="w-full p-6 bg-slate-900 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase tracking-tighter active:scale-95 transition-all">Setting <ChevronRight/></button>
            </div>
          </div>
        </div>
      )}

      {selectedStock && (
        <div className="fixed inset-0 z-[100] flex items-end animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedStock(null)} />
          <div className="relative w-full bg-white rounded-t-[50px] p-10 animate-in slide-in-from-bottom duration-500 shadow-2xl">
            <h3 className="text-3xl font-black mb-8 italic uppercase tracking-tighter" style={{ color: selectedStock.color }}>{selectedStock.ticker}</h3>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="p-6 bg-blue-50 rounded-[35px] border border-blue-100 text-center shadow-inner"><p className="text-[10px] font-black mb-1 uppercase text-blue-400 tracking-widest leading-none">Target (TP)</p><p className="text-2xl font-black text-blue-700 leading-none mt-1">${fUSD(selectedStock.tp)}</p></div>
              <div className="p-6 bg-red-50 rounded-[35px] border border-red-100 text-center shadow-inner"><p className="text-[10px] font-black mb-1 uppercase text-red-400 tracking-widest leading-none">Loss (SL)</p><p className="text-2xl font-black text-red-700 leading-none mt-1">${fUSD(selectedStock.sl)}</p></div>
            </div>
            <button onClick={() => setSelectedStock(null)} className="w-full py-5 bg-slate-900 text-white rounded-[30px] font-black text-lg shadow-xl uppercase active:scale-95 transition-all">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}