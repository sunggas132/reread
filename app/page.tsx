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

  const fUSD = (v: number) => (Math.floor(v * 100) / 100).toFixed(2);
  const fKRWk = (v: number) => Math.floor(v / 1000).toLocaleString() + 'k';
  const fFullKRW = (v: number) => Math.floor(v).toLocaleString();

  // 🚀 [백그라운드 전용] 앱 시작 시 종가(pc)를 조용히 업데이트하는 함수 [cite: 2026-01-11]
  const updateBackgroundPrices = useCallback(async (currentStocks: any[]) => {
    try {
      const updated = await Promise.all(currentStocks.map(async (s) => {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        // 종가(pc)가 있으면 그걸 쓰고, 없으면 평단가라도 넣어서 '...' 방지 [cite: 2026-01-11]
        return { ...s, currentPrice: data.pc || s.avgPrice };
      }));
      setStocks(updated);
    } catch (e) { console.error("Background Update Error:", e); }
  }, []);

  // 🛠️ [실시간 전용] 버튼 눌렀을 때만 1초 간격으로 현재가(c) 정밀 업데이트 [cite: 2026-01-11]
  const updateRealTimeData = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newStocks = [...stocks];
      for (let i = 0; i < newStocks.length; i++) {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${newStocks[i].ticker}&token=${FINNHUB_API_KEY}`);
        const data = await res.json();
        const price = data.c !== 0 ? data.c : data.pc;
        if (price) newStocks[i] = { ...newStocks[i], currentPrice: price };
        setStocks([...newStocks]); // 한 종목씩 실시간으로 숫자가 바뀌는 걸 보여줌
        await new Promise(r => setTimeout(r, 1100)); // API 차단 방지 [cite: 2026-01-11]
      }
      // 환율도 함께 업데이트
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateData = await rateRes.json();
      if (rateData.rates?.KRW) setExchangeRate(rateData.rates.KRW);
    } catch (e) { console.error(e); }
    setIsUpdating(false);
  }, [stocks, isUpdating]);

  useEffect(() => {
    const saved = localStorage.getItem('stockApp_real_final_v5');
    if (saved) {
      const p = JSON.parse(saved);
      setStocks(p.stocks); setTotalCashUSD(p.cash); setTargetPortfolio(p.goal); setWatchlist(p.watch);
      updateBackgroundPrices(p.stocks); // 🏠 앱 켜지자마자 백그라운드 업데이트 시작 [cite: 2026-01-11]
    }
    setIsLoaded(true);
  }, [updateBackgroundPrices]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('stockApp_real_final_v5', JSON.stringify({ stocks, cash: totalCashUSD, goal: targetPortfolio, watch: watchlist }));
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
          {/* 상단바: 'My Assets' 대신 콤팩트한 통합 바 [cite: 2026-01-11] */}
          <div className="flex justify-between items-center bg-[#0f172a] text-white px-5 py-4 rounded-[28px] shadow-xl mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/30">Total Assets</span>
                <button onClick={updateRealTimeData} className={`text-slate-400 ${isUpdating ? 'animate-spin' : ''}`}><RefreshCw size={10}/></button>
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter leading-none">₩ {fFullKRW(processedAssets.totalKRW)}</h2>
              <p className="text-slate-500 font-bold text-[9px] mt-1 tracking-tight">$ {fUSD(processedAssets.totalUSD)} <span className="text-slate-700">| ₩{exchangeRate.toFixed(1)}</span></p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-95 transition-all"><Menu size={20}/></button>
              <button onClick={() => { const val = prompt("CASH($)", totalCashUSD.toString()); if(val) setTotalCashUSD(Number(val)); }} className="bg-white text-[#0f172a] px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">CASH 수정</button>
            </div>
          </div>

          {/* 리스트 간격 축소 및 현재가 표시 [cite: 2026-01-11] */}
          <div className="grid grid-cols-6 text-[8px] font-black text-slate-400 border-b pb-1.5 mb-1 text-center uppercase tracking-tighter"><div>티커</div><div>비중</div><div>자산(k)</div><div>수량</div><div>평단</div><div className="text-right">현재가</div></div>
          <div className="space-y-0">
            {processedAssets.list.map((s, i) => (
              <div key={i} onClick={() => s.isStock && setSelectedStock(s)} className="grid grid-cols-6 h-8 items-center italic border-b border-slate-50 text-center active:bg-slate-50 transition-colors">
                <div className="font-black text-[11px] text-left truncate uppercase" style={{ color: s.color }}>{s.ticker}</div>
                <div className="font-bold text-slate-400 text-[9px]">{s.ratio.toFixed(1)}%</div>
                <div className="text-slate-900 text-[10px] font-black">{fKRWk(s.totalKRW)}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.quantity) : '-'}</div>
                <div className="text-slate-400 text-[8px] font-bold">{s.isStock ? fUSD(s.avgPrice) : '-'}</div>
                <div className={`text-right font-black text-[10px] ${s.isStock ? (s.currentPrice >= s.avgPrice ? 'text-red-500' : 'text-blue-500') : 'text-slate-900'}`}>
                  {s.isStock ? (s.currentPrice === 0 ? '...' : fUSD(s.currentPrice)) : '-'}
                </div>
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
      {/* ... 사이드바 및 팝업 코드는 동일하여 생략 ... */}
    </div>
  );
}