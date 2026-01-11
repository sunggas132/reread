'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Menu, X, Plus, ChevronRight } from 'lucide-react';

const FINNHUB_API_KEY = 'ct7h7rpr01qm40dlrla0ct7h7rpr01qm40dlrlag'; 

export default function StockDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'MAIN' | 'GOAL' | 'WATCH' | 'SETTING'>('MAIN');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(1457.37); 
  const [isLoaded, setIsLoaded] = useState(false);

  const [stocks, setStocks] = useState([
    { ticker: 'AAPL', quantity: 12.54, avgPrice: 180.5, sl: 170, tp: 250, color: '#71717a', currentPrice: 195.20 },
    { ticker: 'TSLA', quantity: 15.0, avgPrice: 250.0, sl: 210, tp: 350, color: '#dc2626', currentPrice: 242.10 },
  ]);
  const [totalCashUSD, setTotalCashUSD] = useState(2500);
  const [targetPortfolio, setTargetPortfolio] = useState([
    { ticker: 'AAPL', ratio: 40 },
    { ticker: 'TSLA', ratio: 30 },
    { ticker: 'CASH', ratio: 30 },
  ]);
  const [watchlist, setWatchlist] = useState([
    { ticker: 'NVDA', part: 450.00, full: 420.00, current: 480.20, color: '#16a34a' }
  ]);

  // 수치 처리 규칙 (내림 및 k단위) [cite: 2026-01-11]
  const fUSD = (v: number) => (Math.floor(v * 100) / 100).toFixed(2);
  const fKRWk = (v: number) => Math.floor(v / 1000).toLocaleString() + 'k';
  const fFullKRW = (v: number) => Math.floor(v).toLocaleString();

  const updateRealTimeData = async () => {
    try {
      const updatedStocks = await Promise.all(stocks.map(async (s) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        return data.c ? { ...s, currentPrice: data.c } : s;
      }));
      setStocks(updatedStocks);
      const updatedWatch = await Promise.all(watchlist.map(async (w) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${w.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        return data.c ? { ...w, current: data.c } : w;
      }));
      setWatchlist(updatedWatch);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('stockApp_vFinal');
    if (saved) {
      const p = JSON.parse(saved);
      setStocks(p.stocks); setTotalCashUSD(p.cash); setTargetPortfolio(p.goal); setWatchlist(p.watch);
    }
    setIsLoaded(true); updateRealTimeData();
    const timer = setInterval(updateRealTimeData, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('stockApp_vFinal', JSON.stringify({ stocks, cash: totalCashUSD, goal: targetPortfolio, watch: watchlist }));
  }, [stocks, totalCashUSD, targetPortfolio, watchlist, isLoaded]);

  const processedAssets = useMemo(() => {
    const stockItems = stocks.map(s => ({ ...s, totalUSD: s.quantity * s.currentPrice, totalKRW: s.quantity * s.currentPrice * exchangeRate, isStock: true }));
    const cashItem = { ticker: 'CASH', totalUSD: totalCashUSD, totalKRW: totalCashUSD * exchangeRate, isStock: false, quantity: totalCashUSD, avgPrice: 0, currentPrice: 0, color: '#000' };
    const all = [...stockItems, cashItem];
    const totalUSD = all.reduce((acc, cur) => acc + cur.totalUSD, 0);
    const totalKRW = all.reduce((acc, cur) => acc + cur.totalKRW, 0);
    return { list: all.map(s => ({ ...s, ratio: totalUSD > 0 ? (s.totalUSD / totalUSD) * 100 : 0 })), totalUSD, totalKRW };
  }, [stocks, totalCashUSD, exchangeRate]);

  if (!isLoaded) return null;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative font-sans text-slate-900 pb-20">
      {/* 메인 화면 */}
      {activeTab === 'MAIN' && (
        <div className="animate-in fade-in duration-500">
          <div className="p-4 flex justify-between items-center mt-2">
            <div><h1 className="font-black text-2xl italic tracking-tighter uppercase">My Assets</h1><p className="text-[10px] font-bold text-slate-400 uppercase">LIVE ₩{exchangeRate}</p></div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl"><Menu size={24}/></button>
          </div>
          <div className="px-4 mb-8">
            <div className="bg-[#0f172a] text-white p-6 rounded-[35px] shadow-2xl">
              <p className="text-[9px] font-bold text-slate-500 text-center mb-1 uppercase tracking-widest">Total Balance</p>
              <h2 className="text-3xl font-black text-center mb-1 italic">₩ {fFullKRW(processedAssets.totalKRW)}</h2>
              <div className="flex justify-between items-center mt-6 border-t border-white/10 pt-4 px-2">
                <p className="text-slate-400 font-bold text-xs">$ {fUSD(processedAssets.totalUSD)}</p>
                <button onClick={() => { const val = prompt("입금($)"); if (val) setTotalCashUSD(prev => prev + Number(val)); }} className="bg-white text-slate-900 px-4 py-2 rounded-full text-[10px] font-black shadow-lg">+ 달러 입금</button>
              </div>
            </div>
          </div>
          <div className="px-4">
            <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase">
              <div className="text-left">티커</div><div>비중</div><div>자산(k)</div><div>수량</div><div>평단</div><div className="text-right">현재가</div>
            </div>
            {processedAssets.list.map((s, i) => (
              <div key={i} onClick={() => s.isStock && setSelectedStock(s)} className="grid grid-cols-6 h-12 items-center italic border-b border-slate-50 active:bg-slate-50 cursor-pointer text-center">
                <div className="font-black text-[12px] text-left" style={{ color: s.color }}>{s.ticker}</div>
                <div className="font-bold text-slate-500 text-[10px]">{s.ratio.toFixed(1)}%</div>
                <div className="text-slate-900 text-[11px] font-black">{fKRWk(s.totalKRW)}</div>
                <div className="text-slate-400 text-[9px] font-bold">{s.isStock ? fUSD(s.quantity) : '-'}</div>
                <div className="text-slate-400 text-[9px] font-bold">{s.isStock ? fUSD(s.avgPrice) : '-'}</div>
                <div className={`text-right font-black text-[10px] ${s.isStock ? (s.currentPrice >= s.avgPrice ? 'text-red-500' : 'text-blue-500') : 'text-slate-900'}`}>{s.isStock ? fUSD(s.currentPrice) : '-'}</div>
              </div>
            ))}
            <div className="h-44 mt-4">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={processedAssets.list} dataKey="ratio" nameKey="ticker" innerRadius={45} outerRadius={65} paddingAngle={3} label={({ticker, ratio}: any) => `${ticker} ${ratio.toFixed(0)}%`} labelLine={false}>{processedAssets.list.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}</Pie></PieChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 관심 종목 */}
      {activeTab === 'WATCH' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase">Watch</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          <div className="grid grid-cols-4 text-[9px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase"><div className="text-left">티커</div><div>현재가</div><div>1차 진입</div><div>강력 진입</div></div>
          {watchlist.map((w, i) => (
            <div key={i} className="grid grid-cols-4 h-14 items-center border-b border-slate-50 italic text-center">
              <div className="font-black text-[13px] text-left" style={{ color: w.color }}>{w.ticker}</div>
              <div className="font-black text-[11px]">${fUSD(w.current)}</div>
              <div className="font-bold text-[11px] text-orange-500">${fUSD(w.part)}</div>
              <div className="font-bold text-[11px] text-red-500">${fUSD(w.full)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 목표 비중 */}
      {activeTab === 'GOAL' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase">Goal</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          <div className="grid grid-cols-3 text-[9px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase"><div className="text-left">티커</div><div>목표 비율(%)</div><div className="text-right">목표 금액($)</div></div>
          {targetPortfolio.map((t, i) => (
            <div key={i} className="grid grid-cols-3 h-14 items-center border-b border-slate-50 italic">
              <div className="text-left font-black text-[13px]">{t.ticker}</div>
              <div className="px-4"><input type="number" value={t.ratio} onChange={e => { const n = [...targetPortfolio]; n[i].ratio = Number(e.target.value); setTargetPortfolio(n); }} className="w-full bg-slate-100 p-2 rounded-xl font-black text-center text-[11px]" /></div>
              <div className="text-right font-black text-[11px] text-slate-900">${fUSD((processedAssets.totalUSD * t.ratio) / 100)}</div>
            </div>
          ))}
          <div className="h-44 mt-10"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={targetPortfolio} dataKey="ratio" nameKey="ticker" innerRadius={45} outerRadius={65} paddingAngle={3} label={({ticker, ratio}: any) => `${ticker} ${ratio}%`} labelLine={false}>{targetPortfolio.map((t, i) => <Cell key={i} fill={stocks.find(s => s.ticker === t.ticker)?.color || '#cbd5e1'} stroke="none" />)}</Pie></PieChart></ResponsiveContainer></div>
        </div>
      )}

      {/* 자산 설정 */}
      {activeTab === 'SETTING' && (
        <div className="p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6 mt-2"><h1 className="font-black text-2xl italic tracking-tighter uppercase">Setting</h1><button onClick={() => setActiveTab('MAIN')} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
          <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-2 mb-2 text-center uppercase"><div>색상</div><div>티커</div><div>수량</div><div>평단</div><div>손절</div><div>익절</div></div>
          {stocks.map((s, i) => (
            <div key={i} className="grid grid-cols-6 gap-1 items-center bg-slate-50 p-3 rounded-2xl mb-2">
              <input type="color" value={s.color} onChange={e => { const n = [...stocks]; n[i].color = e.target.value; setStocks(n); }} className="w-full h-6 rounded-lg border-none" />
              <input value={s.ticker} onChange={e => { const n = [...stocks]; n[i].ticker = e.target.value.toUpperCase(); setStocks(n); }} className="text-[11px] font-black w-full text-center bg-transparent outline-none" />
              <input type="number" value={s.quantity} onChange={e => { const n = [...stocks]; n[i].quantity = Number(e.target.value); setStocks(n); }} className="text-[10px] w-full text-center bg-white p-1 rounded font-bold" />
              <input type="number" value={s.avgPrice} onChange={e => { const n = [...stocks]; n[i].avgPrice = Number(e.target.value); setStocks(n); }} className="text-[10px] w-full text-center bg-white p-1 rounded font-bold" />
              <input type="number" value={s.sl} onChange={e => { const n = [...stocks]; n[i].sl = Number(e.target.value); setStocks(n); }} className="text-[10px] w-full text-center bg-red-100 text-red-600 p-1 rounded font-bold" />
              <input type="number" value={s.tp} onChange={e => { const n = [...stocks]; n[i].tp = Number(e.target.value); setStocks(n); }} className="text-[10px] w-full text-center bg-blue-100 text-blue-600 p-1 rounded font-bold" />
            </div>
          ))}
          <button onClick={() => setStocks([...stocks, { ticker: 'NEW', quantity: 0, avgPrice: 0, currentPrice: 0, sl: 0, tp: 0, color: '#000' }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[25px] text-slate-300 flex justify-center mt-2"><Plus/></button>
        </div>
      )}

      {/* 메뉴 사이드바 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-full bg-white flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 flex justify-between items-center border-b font-black text-xl italic uppercase mt-2">MENU <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button></div>
            <div className="flex-1 p-6 space-y-4">
              <button onClick={() => {setActiveTab('GOAL'); setIsSidebarOpen(false);}} className="w-full p-6 bg-slate-900 text-white rounded-[30px] font-black text-left flex justify-between items-center shadow-xl tracking-tighter uppercase">GOAL <ChevronRight/></button>
              <button onClick={() => {setActiveTab('WATCH'); setIsSidebarOpen(false);}} className="w-full p-6 bg-white border-2 rounded-[30px] font-black text-left flex justify-between items-center tracking-tighter uppercase">WATCHLIST <ChevronRight/></button>
              <button onClick={() => {setActiveTab('SETTING'); setIsSidebarOpen(false);}} className="w-full p-6 bg-white border-2 rounded-[30px] font-black text-left flex justify-between items-center tracking-tighter uppercase">SETTING <ChevronRight/></button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 팝업 */}
      {selectedStock && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStock(null)} />
          <div className="relative w-full bg-white rounded-t-[45px] p-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <h3 className="text-3xl font-black mb-8 italic uppercase" style={{ color: selectedStock.color }}>{selectedStock.ticker}</h3>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="p-6 bg-blue-50 rounded-[35px] border border-blue-100 text-center"><p className="text-[10px] font-black mb-1 uppercase text-blue-400 tracking-widest">Target Profit</p><p className="text-2xl font-black text-blue-700">${fUSD(selectedStock.tp)}</p></div>
              <div className="p-6 bg-red-50 rounded-[35px] border border-red-100 text-center"><p className="text-[10px] font-black mb-1 uppercase text-red-400 tracking-widest">Stop Loss</p><p className="text-2xl font-black text-red-700">${fUSD(selectedStock.sl)}</p></div>
            </div>
            <button onClick={() => setSelectedStock(null)} className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black text-lg shadow-xl uppercase">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}