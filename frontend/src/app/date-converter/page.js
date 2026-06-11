'use client';
import { useState, useEffect } from 'react';
import { Scale, CalendarDays, ArrowLeftRight, RefreshCw, Clock } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

const MONTHS_AD = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_BS = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const MONTHS_BS_NP = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];

export default function DateConverterPage() {
  const [mode, setMode] = useState('ad-to-bs');
  const [adDate, setAdDate] = useState({ year: '', month: '', day: '' });
  const [bsDate, setBsDate] = useState({ year: '', month: '', day: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [today, setToday] = useState(null);

  useEffect(() => { fetchToday(); }, []);

  async function fetchToday() {
    try {
      const { data } = await api.get('/date/today');
      if (data.success) setToday(data);
    } catch {}
  }

  async function handleConvert() {
    setLoading(true);
    setResult(null);
    try {
      const params = mode === 'ad-to-bs'
        ? `year=${adDate.year}&month=${adDate.month}&day=${adDate.day}`
        : `year=${bsDate.year}&month=${bsDate.month}&day=${bsDate.day}`;
      const endpoint = mode === 'ad-to-bs' ? '/date/ad-to-bs' : '/date/bs-to-ad';
      const { data } = await api.get(`${endpoint}?${params}`);
      if (data.success) setResult(data);
      else alert(data.error || 'Conversion failed');
    } catch (e) {
      alert(e.response?.data?.error || 'Conversion failed');
    }
    setLoading(false);
  }

  function swapMode() {
    setMode(m => m === 'ad-to-bs' ? 'bs-to-ad' : 'ad-to-bs');
    setResult(null);
  }

  function setTodayAd() {
    if (!today) return;
    const d = today.ad;
    setAdDate({ year: String(d.year), month: String(d.month), day: String(d.day) });
  }

  function setTodayBs() {
    if (!today) return;
    const d = today.bs;
    setBsDate({ year: String(d.year), month: String(d.month), day: String(d.day) });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-secondary-800 font-bold text-xl">
            <Scale className="w-6 h-6 text-primary" />
            KanoonSathi
          </Link>
          <div className="flex items-center gap-4">
            {today && (
              <span className="text-sm text-gray-500 hidden sm:block">
                {today.ad.dayName}, {today.ad.monthName} {today.ad.day}, {today.ad.year} / {today.bs.monthNameNp} {today.bs.day}, {today.bs.year}
              </span>
            )}
            <Link href="/chat" className="text-sm text-primary hover:text-primary-700 font-medium">Ask AI</Link>
            <Link href="/lawyers" className="text-sm text-gray-600 hover:text-gray-800">Find Lawyers</Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <CalendarDays className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-800 mb-2">Date Converter</h1>
          <p className="text-gray-500">Convert between Bikram Sambat (BS) and Gregorian (AD) dates</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <button onClick={() => { setMode('ad-to-bs'); setResult(null); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'ad-to-bs' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              AD to BS
            </button>
            <button onClick={swapMode}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeftRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => { setMode('bs-to-ad'); setResult(null); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'bs-to-ad' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              BS to AD
            </button>
          </div>

          {mode === 'ad-to-bs' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Gregorian Date (AD)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input type="number" placeholder="Year" value={adDate.year}
                    onChange={e => setAdDate(p => ({ ...p, year: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <select value={adDate.month} onChange={e => setAdDate(p => ({ ...p, month: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                    <option value="">Month</option>
                    {MONTHS_AD.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <input type="number" placeholder="Day" min="1" max="31" value={adDate.day}
                    onChange={e => setAdDate(p => ({ ...p, day: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={setTodayAd}
                  className="text-xs text-primary hover:text-primary-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Use today&apos;s date
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Bikram Sambat Date (BS)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input type="number" placeholder="Year" value={bsDate.year}
                    onChange={e => setBsDate(p => ({ ...p, year: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <select value={bsDate.month} onChange={e => setBsDate(p => ({ ...p, month: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                    <option value="">Month</option>
                    {MONTHS_BS.map((m, i) => <option key={i} value={i + 1}>{m} ({MONTHS_BS_NP[i]})</option>)}
                  </select>
                </div>
                <div>
                  <input type="number" placeholder="Day" min="1" max="32" value={bsDate.day}
                    onChange={e => setBsDate(p => ({ ...p, day: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={setTodayBs}
                  className="text-xs text-primary hover:text-primary-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Use today&apos;s date
                </button>
              </div>
            </div>
          )}

          <button onClick={handleConvert} disabled={loading}
            className="w-full mt-6 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Convert
          </button>

          {result && (
            <div className="mt-6 p-5 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl border border-primary/10 animate-fade-in">
              {mode === 'ad-to-bs' ? (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{result.ad.dayName}, {result.ad.monthName} {result.ad.day}, {result.ad.year}</p>
                  <div className="text-center py-3">
                    <p className="text-3xl font-bold text-secondary-800">{result.bs.monthNameNp} {result.bs.day}, {result.bs.year} BS</p>
                    <p className="text-lg text-gray-600 mt-1">{result.bs.monthName} {result.bs.day}, {result.bs.year}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{result.bs.monthNameNp} {result.bs.day}, {result.bs.year} BS</p>
                  <div className="text-center py-3">
                    <p className="text-3xl font-bold text-secondary-800">{result.ad.dayName}, {result.ad.monthName} {result.ad.day}, {result.ad.year}</p>
                    <p className="text-lg text-gray-600 mt-1">{result.ad.monthName} {result.ad.day}, {result.ad.year}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-secondary-800 mb-3">About Bikram Sambat</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Bikram Sambat (BS) is the official calendar of Nepal, approximately 56 years and 8.5 months ahead of 
            the Gregorian calendar (AD). It is widely used for legal documents, government records, and official correspondence 
            in Nepal. The Nepali year starts in mid-April with the month of Baisakh.
          </p>
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} KanoonSathi. All rights reserved.
      </footer>
    </div>
  );
}
