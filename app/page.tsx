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

  // 🚀 핵심: 수동 새로고침 버튼 전용 실시간 업데이트 함수 [cite: 2026-01-11]
  const updateRealTimeData = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updatedStocks = await Promise.all(stocks.map(async (s) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c !== 0 ? data.c : data.pc;
        return price ? { ...s, currentPrice: price } : s;
      }));
      setStocks(updatedStocks);

      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateData = await rateRes.json();
      if (rateData.rates && rateData.rates.KRW) setExchangeRate(rateData.rates.KRW);
    } catch (e) { console.error(e); }
    setIsUpdating(false);
  }, [stocks, isUpdating]);

  // 🏠 자동 업데이트: 앱 시작 시 안정적인 '종가(pc)'만 1회 로드 [cite: 2026-01-11]
  const loadInitialPrices = useCallback(async (currentStocks: any[]) => {
    try {
      const updated = await Promise.all(currentStocks.map(async (s) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        return { ...s, currentPrice: data.pc || s.avgPrice }; // 종가 우선 로드 [cite: 2026-01-11]
      }));
      setStocks(updated);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('stockApp_realreal_compact_v3');
    if (saved) {
      const p = JSON.parse(saved);
      setStocks(p.stocks); setTotalCashUSD(p.cash); setTargetPortfolio(p.goal); setWatchlist(p.watch);
      loadInitialPrices(p.stocks); // 저장된 데이터 기반 가격 로드 [cite: 2026-01-11]
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('stockApp_realreal_compact_v3', JSON.stringify({ stocks, cash: totalCashUSD, goal: targetPortfolio, watch: watchlist }));
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
      
      {/* 1. MAIN (상단바 통합형) [cite: 2026-01-11] */}
      {activeTab === 'MAIN' && (
        <div className="p-3">
          <div className="flex justify-between items-center bg-[#0f172a] text-white px-5 py-4 rounded-[28px] shadow-xl mb-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Balance</span>
                <button onClick={updateRealTimeData} className={`text-slate-400 ${isUpdating ? 'animate-spin' : ''}`}><RefreshCw size={10}/></button>
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter leading-none">₩ {fFullKRW(processedAssets.totalKRW)}</h2>
              <p className="text-slate-400 font-bold text-[9px] mt-1 tracking-tight">$ {fUSD(processedAssets.totalUSD)} <span className="text-slate-600">| ₩{exchangeRate.toFixed(1)}</span></p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl"><Menu size={20}/></button>
              <button onClick={() => { const val = prompt("CASH($)", totalCashUSD.toString()); if(val) setTotalCashUSD(Number(val)); }} className="bg-white text-[#0f172a] px-3 py-1.5 rounded-full text-[9px] font-black uppercase">CASH 수정</button>
            </div>
          </div>

          <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-1.5 mb-1 text-center uppercase tracking-tighter"><div>티커</div><div>비중</div><div>자산(k)</div><div>수량</div><div>평단</div><div className="text-right">현재가</div></div>
          <div className="space-y-0.5">
            {processedAssets.list.map((s, i) => (
              <div key={i} onClick={() => s.isStock && setSelectedStock(s)} className="grid grid-cols-6 h-9 items-center italic border-b border-slate-50 text-center active:bg-slate-50 transition-colors">
                <div className="font-black text-[11px] text-left truncate" style={{ color: s.color }}>{s.ticker}</div>
                <div className="font-bold text-slate-400 text-[9px]">{s.ratio.toFixed(1)}%</div>
                <div className="text-slate-900 text-[10px] font-black">{fKRWk(s.totalKRW)}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.quantity) : '-'}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.avgPrice) : '-'}</div>
                <div className={`text-right font-black text-[10px] ${s.isStock ? (s.currentPrice >= s.avgPrice ? 'text-red-500' : 'text-blue-500') : 'text-slate-900'}`}>{s.isStock ? (s.currentPrice === 0 ? '...' : fUSD(s.currentPrice)) : '-'}</div>
              </div>
            ))}
          </div>

          <div className="h-44 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={processedAssets.list} dataKey="ratio" isAnimationActive={false} innerRadius={40} outerRadius={60} paddingAngle={2} label={({ticker, ratio}: any) => `${ticker} ${ratio.toFixed(0)}%`} labelLine={false}>
                  {processedAssets.list.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. WATCH / 3. GOAL / 4. SETTING (행 간격 축소 유지) [cite: 2026-01-11] */}
      {activeTab === 'WATCH' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4 mt-1"><h1 className="font-black text-xl italic uppercase text-orange-500">Watchlist</h1><button onClick={() => setActiveTab('MAIN')} className="p-1.5 bg-slate-100 rounded-lg"><X size={20}/></button></div>
          <div className="grid grid-cols-5 text-[9px] font-black text-slate-400 border-b pb-1.5 mb-1.5 text-center uppercase tracking-tighter"><div>색상</div><div>티커</div><div>현재</div><div>1차</div><div>강력</div></div>
          {watchlist.map((w, i) => (
            <div key={i} className="grid grid-cols-5 h-11 items-center border-b border-slate-50 italic text-center text-[10px]">
              <input type="color" value={w.color} onChange={e => updateTickerColor(w.ticker, e.target.value)} className="w-5 h-5 rounded-full mx-auto border-none cursor-pointer" />
              <div className="font-black" style={{ color: w.color }}>{w.ticker}</div>
              <div className="font-black">${fUSD(w.current)}</div>
              <input type="number" value={w.part} onChange={e => { const n = [...watchlist]; n[i].part = Number(e.target.value); setWatchlist(n); }} className="w-[85%] bg-slate-50 p-1 rounded font-bold text-center text-orange-500 mx-auto" />
              <input type="number" value={w.full} onChange={e => { const n = [...watchlist]; n[i].full = Number(e.target.value); setWatchlist(n); }} className="w-[85%] bg-slate-50 p-1 rounded font-bold text-center text-red-500 mx-auto" />
            </div>
          ))}
          <button onClick={() => setWatchlist([...watchlist, { ticker: 'NEW', part: 0, full: 0, current: 0, color: '#000' }])} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-[20px] text-slate-200 flex justify-center mt-4"><Plus size={18}/></button>
        </div>
      )}

      {activeTab === 'GOAL' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-1 mt-1"><h1 className="font-black text-xl italic uppercase text-blue-600">Goal</h1><button onClick={() => setActiveTab('MAIN')} className="p-1.5 bg-slate-100 rounded-lg"><X size={20}/></button></div>
          <div className="h-44 mb-4"><ResponsiveContainer width="100%" height="100%"><PieChart>
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
          <button onClick={() => setTargetPortfolio([...targetPortfolio, { ticker: 'NEW', ratio: 0 }])} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-[20px] text-slate-200 flex justify-center mt-4"><Plus size={18}/></button>
        </div>
      )}

      {/* 사이드바 메뉴 및 상세 팝업 동일 유지 [cite: 2026-01-11] */}
      {isSidebarOpen && activeTab === 'MAIN' && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-[80%] bg-white flex flex-col h-full ml-auto shadow-2xl">
            <div className="p-8 flex justify-between items-center border-b font-black text-xl italic uppercase mt-4 tracking-widest text-slate-900">Menu <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 bg-slate-100 rounded-lg"><X size={28}/></button></div>
            <div className="p-6 space-y-4">
              <button onClick={() => {setActiveTab('GOAL'); setIsSidebarOpen(false);}} className="w-full p-6 bg-blue-600 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase active:scale-95 transition-all">Goal <ChevronRight/></button>
              <button onClick={() => {setActiveTab('WATCH'); setIsSidebarOpen(false);}} className="w-full p-6 bg-orange-500 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase active:scale-95 transition-all">Watchlist <ChevronRight/></button>
              <button onClick={() => {setActiveTab('SETTING'); setIsSidebarOpen(false);}} className="w-full p-6 bg-slate-900 text-white rounded-[32px] font-black text-left flex justify-between items-center shadow-lg text-base uppercase active:scale-95 transition-all">Setting <ChevronRight/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}