'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Menu, X, Plus, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';

const FINNHUB_API_KEY = 'ct7h7rpr01qm40dlrla0ct7h7rpr01qm40dlrlag'; 

export default function StockDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'MAIN' | 'GOAL' | 'WATCH' | 'SETTING'>('MAIN');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(1450); 
  const [isLoaded, setIsLoaded] = useState(false);

  // 데이터 상태 관리 [cite: 2026-01-11]
  const [stocks, setStocks] = useState([{ ticker: 'AAPL', quantity: 10, avgPrice: 180, sl: 170, tp: 250, color: '#71717a', currentPrice: 0 }]);
  const [totalCashUSD, setTotalCashUSD] = useState(0);
  const [targetPortfolio, setTargetPortfolio] = useState([{ ticker: 'AAPL', ratio: 50 }, { ticker: 'CASH', ratio: 50 }]);
  const [watchlist, setWatchlist] = useState([{ ticker: 'NVDA', part: 450, full: 400, current: 0, color: '#16a34a' }]);

  // 🎨 티커 색상 전 화면 동기화 [cite: 2026-01-11]
  const updateTickerColor = (ticker: string, newColor: string) => {
    setStocks(prev => prev.map(s => s.ticker === ticker ? { ...s, color: newColor } : s));
    setWatchlist(prev => prev.map(w => w.ticker === ticker ? { ...w, color: newColor } : w));
  };

  const fUSD = (v: number) => (Math.floor(v * 100) / 100).toFixed(2);
  const fKRWk = (v: number) => Math.floor(v / 1000).toLocaleString() + 'k';
  const fFullKRW = (v: number) => Math.floor(v).toLocaleString();

  // 🚀 가격/환율 업데이트 (휴장 시 종가 활용) [cite: 2026-01-11]
  const updateRealTimeData = useCallback(async () => {
    try {
      const updatedStocks = await Promise.all(stocks.map(async (s) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c !== 0 ? data.c : data.pc;
        return price ? { ...s, currentPrice: price } : s;
      }));
      setStocks(updatedStocks);

      const updatedWatch = await Promise.all(watchlist.map(async (w) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${w.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c !== 0 ? data.c : data.pc;
        return price ? { ...w, current: price } : w;
      }));
      setWatchlist(updatedWatch);

      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateData = await rateRes.json();
      if (rateData.rates && rateData.rates.KRW) setExchangeRate(rateData.rates.KRW);
    } catch (e) { console.error(e); }
  }, [stocks, watchlist]);

  useEffect(() => {
    const saved = localStorage.getItem('stockApp_realreal_optimized');
    if (saved) {
      const p = JSON.parse(saved);
      setStocks(p.stocks); setTotalCashUSD(p.cash); setTargetPortfolio(p.goal); setWatchlist(p.watch);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('stockApp_realreal_optimized', JSON.stringify({ stocks, cash: totalCashUSD, goal: targetPortfolio, watch: watchlist }));
      updateRealTimeData();
    }
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
    <div className="max-w-md mx-auto bg-white min-h-screen relative font-sans text-slate-900 pb-20">
      
      {/* 1. MAIN 화면 (자산 카드 1/2 축소) [cite: 2026-01-11] */}
      {activeTab === 'MAIN' && (
        <div className="p-4 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-4">
            <div><h1 className="font-black text-2xl italic uppercase tracking-tighter">My Assets</h1><p className="text-[10px] font-bold text-slate-400 uppercase">₩{exchangeRate.toFixed(2)} <button onClick={updateRealTimeData}><RefreshCw size={10}/></button></p></div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl"><Menu size={24}/></button>
          </div>
          {/* 높이 줄인 자산 카드 [cite: 2026-01-11] */}
          <div className="bg-[#0f172a] text-white p-4 rounded-[30px] shadow-2xl mb-6">
            <h2 className="text-2xl font-black text-center italic mb-3">₩ {fFullKRW(processedAssets.totalKRW)}</h2>
            <div className="flex justify-between items-center border-t border-white/10 pt-3 px-1">
              <p className="text-slate-400 font-bold text-[10px]">$ {fUSD(processedAssets.totalUSD)}</p>
              <button onClick={() => { const val = prompt("보유 현금($)", totalCashUSD.toString()); if(val) setTotalCashUSD(Number(val)); }} className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-[9px] font-black uppercase">Cash 수정</button>
            </div>
          </div>
          {/* 6열 리스트 [cite: 2026-01-11] */}
          <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase tracking-tighter"><div>티커</div><div>비중</div><div>자산(k)</div><div>수량</div><div>평단</div><div className="text-right">현재가</div></div>
          {processedAssets.list.map((s, i) => (
            <div key={i} onClick={() => s.isStock && setSelectedStock(s)} className="grid grid-cols-6 h-11 items-center italic border-b border-slate-50 text-center">
              <div className="font-black text-[12px] text-left" style={{ color: s.color }}>{s.ticker}</div>
              <div className="font-bold text-slate-500 text-[9px]">{s.ratio.toFixed(1)}%</div>
              <div className="text-slate-900 text-[10px] font-black">{fKRWk(s.totalKRW)}</div>
              <div className="text-slate-400 text-[9px] font-bold">{s.isStock ? fUSD(s.quantity) : '-'}</div>
              <div className="text-slate-400 text-[9px] font-bold">{s.isStock ? fUSD(s.avgPrice) : '-'}</div>
              <div className={`text-right font-black text-[10px] ${s.isStock ? (s.currentPrice >= s.avgPrice ? 'text-red-500' : 'text-blue-500') : 'text-slate-900'}`}>{s.isStock ? (s.currentPrice === 0 ? '...' : fUSD(s.currentPrice)) : '-'}</div>
            </div>
          ))}
          {/* 메인 원그래프 [cite: 2026-01-11] */}
          <div className="h-44 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={processedAssets.list} dataKey="ratio" nameKey="ticker" innerRadius={45} outerRadius={65} paddingAngle={3} label={({ticker, ratio}: any) => `${ticker} ${ratio.toFixed(0)}%`} labelLine={false}>{processedAssets.list.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}</Pie></PieChart></ResponsiveContainer></div>
        </div>
      )}

      {/* 2. WATCH (종목 추가 및 색상 동기화) */}
      {activeTab === 'WATCH' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase text-orange-500">Watchlist</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          <div className="grid grid-cols-5 text-[9px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase"><div>색상</div><div>티커</div><div>현재가</div><div>1차</div><div>강력</div></div>
          {watchlist.map((w, i) => (
            <div key={i} className="grid grid-cols-5 h-14 items-center border-b border-slate-50 italic text-center">
              <input type="color" value={w.color} onChange={e => updateTickerColor(w.ticker, e.target.value)} className="w-6 h-6 rounded-full mx-auto border-none cursor-pointer" />
              <div className="font-black text-[12px]" style={{ color: w.color }}>{w.ticker}</div>
              <div className="font-black text-[10px]">${fUSD(w.current)}</div>
              <input type="number" value={w.part} onChange={e => { const n = [...watchlist]; n[i].part = Number(e.target.value); setWatchlist(n); }} className="w-full bg-slate-50 p-1 rounded font-bold text-center text-[10px] text-orange-500" />
              <input type="number" value={w.full} onChange={e => { const n = [...watchlist]; n[i].full = Number(e.target.value); setWatchlist(n); }} className="w-full bg-slate-50 p-1 rounded font-bold text-center text-[10px] text-red-500" />
            </div>
          ))}
          <button onClick={() => setWatchlist([...watchlist, { ticker: 'NEW', part: 0, full: 0, current: 0, color: '#000' }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[25px] text-slate-300 flex justify-center mt-4"><Plus/></button>
        </div>
      )}

      {/* 3. GOAL (원그래프 최상단 배치) [cite: 2026-01-11] */}
      {activeTab === 'GOAL' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-2 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase text-blue-600">Goal</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          {/* 원그래프 최상단 [cite: 2026-01-11] */}
          <div className="h-48 mb-6"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={targetPortfolio} dataKey="ratio" nameKey="ticker" innerRadius={45} outerRadius={65} paddingAngle={3} label={({ticker, ratio}: any) => `${ticker} ${ratio}%`} labelLine={false}>{targetPortfolio.map((t, i) => <Cell key={i} fill={stocks.find(s => s.ticker === t.ticker)?.color || (t.ticker === 'CASH' ? '#000' : '#cbd5e1')} stroke="none" />)}</Pie></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-4 text-[9px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase"><div>색상</div><div>티커</div><div>목표(%)</div><div>금액($)</div></div>
          {targetPortfolio.map((t, i) => (
            <div key={i} className="grid grid-cols-4 h-14 items-center border-b border-slate-50 italic text-center">
              {t.ticker !== 'CASH' ? <input type="color" value={stocks.find(s => s.ticker === t.ticker)?.color || '#e2e8f0'} onChange={e => updateTickerColor(t.ticker, e.target.value)} className="w-6 h-6 rounded-full mx-auto border-none cursor-pointer" /> : <div></div>}
              <div className="font-black text-[12px]">{t.ticker}</div>
              <input type="number" value={t.ratio} onChange={e => { const n = [...targetPortfolio]; n[i].ratio = Number(e.target.value); setTargetPortfolio(n); }} className="w-full bg-slate-50 p-1 rounded font-black text-center text-[11px]" />
              <div className="font-black text-[10px] text-slate-900">${fUSD((processedAssets.totalUSD * t.ratio) / 100)}</div>
            </div>
          ))}
          <button onClick={() => setTargetPortfolio([...targetPortfolio, { ticker: 'NEW', ratio: 0 }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[25px] text-slate-300 flex justify-center mt-4"><Plus/></button>
        </div>
      )}

      {/* 4. SETTING (티커 연동형 색상 설정) */}
      {activeTab === 'SETTING' && (
        <div className="p-4 animate-in fade-in pb-32">
          <div className="flex justify-between items-center mb-6 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase">Setting</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          <div className="grid grid-cols-7 text-[7px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase tracking-tighter"><div>색상</div><div>티커</div><div>수량</div><div>평단</div><div>손절</div><div>익절</div><div></div></div>
          {stocks.map((s, i) => (
            <div key={i} className="grid grid-cols-7 gap-1 items-center bg-slate-50 p-2 rounded-xl mb-2 italic">
              <input type="color" value={s.color} onChange={e => updateTickerColor(s.ticker, e.target.value)} className="w-5 h-5 rounded mx-auto border-none cursor-pointer" />
              <input value={s.ticker} onChange={e => { const n = [...stocks]; n[i].ticker = e.target.value.toUpperCase(); setStocks(n); }} className="text-[10px] font-black w-full text-center bg-transparent outline-none" />
              <input type="number" value={s.quantity} onChange={e => { const n = [...stocks]; n[i].quantity = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-white p-1 rounded font-bold" />
              <input type="number" value={s.avgPrice} onChange={e => { const n = [...stocks]; n[i].avgPrice = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-white p-1 rounded font-bold" />
              <input type="number" value={s.sl} onChange={e => { const n = [...stocks]; n[i].sl = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-red-100 text-red-600 p-1 rounded font-bold" />
              <input type="number" value={s.tp} onChange={e => { const n = [...stocks]; n[i].tp = Number(e.target.value); setStocks(n); }} className="text-[9px] w-full text-center bg-blue-100 text-blue-700 p-1 rounded font-bold" />
              <button onClick={() => setStocks(stocks.filter((_, idx) => idx !== i))} className="text-slate-300 mx-auto"><Trash2 size={12}/></button>
            </div>
          ))}
          <button onClick={() => setStocks([...stocks, { ticker: 'NEW', quantity: 0, avgPrice: 0, currentPrice: 0, sl: 0, tp: 0, color: '#000' }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[25px] text-slate-300 flex justify-center mt-2"><Plus/></button>
        </div>
      )}

      {/* 사이드바 메뉴 및 상세 팝업 (이전 동일) */}
      {isSidebarOpen && activeTab === 'MAIN' && (
        <div className="fixed inset-0 z-[60] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-[85%] bg-white flex flex-col h-full ml-auto animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-10 flex justify-between items-center border-b font-black text-2xl italic uppercase mt-4">Menu <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-xl"><X size={32}/></button></div>
            <div className="p-8 space-y-6">
              <button onClick={() => {setActiveTab('GOAL'); setIsSidebarOpen(false);}} className="w-full p-8 bg-blue-600 text-white rounded-[40px] font-black text-left flex justify-between items-center shadow-xl text-lg uppercase tracking-tighter">Goal <ChevronRight/></button>
              <button onClick={() => {setActiveTab('WATCH'); setIsSidebarOpen(false);}} className="w-full p-8 bg-orange-500 text-white rounded-[40px] font-black text-left flex justify-between items-center shadow-xl text-lg uppercase tracking-tighter">Watchlist <ChevronRight/></button>
              <button onClick={() => {setActiveTab('SETTING'); setIsSidebarOpen(false);}} className="w-full p-8 bg-slate-900 text-white rounded-[40px] font-black text-left flex justify-between items-center shadow-xl text-lg uppercase tracking-tighter">Setting <ChevronRight/></button>
            </div>
          </div>
        </div>
      )}

      {selectedStock && (
        <div className="fixed inset-0 z-[100] flex items-end animate-in fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedStock(null)} />
          <div className="relative w-full bg-white rounded-t-[60px] p-12 animate-in slide-in-from-bottom duration-500 shadow-2xl">
            <h3 className="text-4xl font-black mb-10 italic uppercase tracking-tighter" style={{ color: selectedStock.color }}>{selectedStock.ticker}</h3>
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-blue-50 rounded-[45px] border border-blue-100 text-center shadow-inner"><p className="text-[11px] font-black mb-2 uppercase text-blue-400 tracking-widest">익절 목표 (TP)</p><p className="text-3xl font-black text-blue-700">${fUSD(selectedStock.tp)}</p></div>
              <div className="p-8 bg-red-50 rounded-[45px] border border-red-100 text-center shadow-inner"><p className="text-[11px] font-black mb-2 uppercase text-red-400 tracking-widest">손절 라인 (SL)</p><p className="text-3xl font-black text-red-700">${fUSD(selectedStock.sl)}</p></div>
            </div>
            <button onClick={() => setSelectedStock(null)} className="w-full py-6 bg-slate-900 text-white rounded-[35px] font-black text-xl shadow-2xl uppercase">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}