import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getLocales } from 'expo-localization';
import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ResultDocument } from '../../src/domain/result-document';
import { copy, type Locale } from './src/i18n';
import { supabase, observeSession, restoreSession } from './src/auth';
import { api, ApiError, historySchema, savedSchema, resultResponseSchema, type History, type Run } from './src/api';
import { nativeBillingEnabled, preparePurchase, purchase, recoverPurchases } from './src/billing';
import { ReviewScreen, type Tier } from './src/ReviewScreen';
import { ResumeScreen } from './src/ResumeScreen';
import { CareerScreen } from './src/CareerScreen';
import { ResultScreen } from './src/ResultScreen';
import { sampleResult } from './src/sample';
import { Page, Card, Heading, Button, Field, Pill, Icon, ui, colors, type IconName } from './src/ui';
type Tab = 'home' | 'review' | 'resume' | 'career' | 'my';
const tabs: { id: Tab; icon: IconName }[] = [{ id: 'home', icon: 'home-outline' }, { id: 'review', icon: 'create-outline' }, { id: 'resume', icon: 'document-text-outline' }, { id: 'career', icon: 'compass-outline' }, { id: 'my', icon: 'person-outline' }];
const emptyHistory: History = { runs: [], entitlements: [] };
function MobileApp() {
  const [locale, setLocale] = useState<Locale>(getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en');
  const t = copy[locale];
  const [tab, setTab] = useState<Tab>('home');
  const [tier, setTier] = useState<Tier>('QUICK');
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [result, setResult] = useState<ResultDocument | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof preparePurchase>> | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [generation, setGeneration] = useState(0);
  const owner = useRef<string | null>(null);
  const mounted = useRef(true);
  const operationEpoch = useRef(0);
  const notify = (text: string) => setNotice(text);
  useEffect(() => {
    mounted.current = true;
    const cleanup = observeSession(next => {
      const nextId = next?.user.id ?? null;
      if (owner.current !== nextId) {
        operationEpoch.current += 1;
        if (owner.current) setGeneration(value => value + 1);
        owner.current = nextId;
        setHistory(emptyHistory); setResult(null); setRun(null); setQuote(null); setCode('');
      }
      setSession(next);
    }, () => setNotice('Secure sign-in storage unavailable.'));
    void restoreSession().catch(() => setNotice('Unable to restore sign-in.'));
    return () => { mounted.current = false; cleanup(); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 7000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busyRef.current) return true;
      if (result) { setResult(null); return true; }
      if (run) { setRun(null); setQuote(null); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [result, run, tab]);
  async function perform(action: (current: () => boolean) => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setNotice('');
    const epoch = operationEpoch.current;
    const current = () => mounted.current && epoch === operationEpoch.current;
    try { await action(current); }
    catch (error) {
      if (current()) {
        const id = error instanceof ApiError ? error.code : '';
        notify(id === 'AUTH_REQUIRED' ? t.loginRequired : id === 'MARKET_NOT_SUPPORTED' ? t.marketPending : ['BILLING_NOT_READY','CONFIG_REQUIRED'].includes(id) ? t.billingPending : `${t.failure}${id ? ` (${id})` : ''}`);
      }
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  async function refresh() { await perform(async current => { const data = await api('history', historySchema); if (current()) setHistory(data); }); }
  async function openRun(selected: Run) {
    await perform(async current => {
      const loaded = await api(`result?id=${selected.id}`, resultResponseSchema);
      if (!current()) return;
      setQuote(null);
      if (loaded.result) { setResult(loaded.result); setRun(null); }
      else setRun({ ...selected, status: loaded.status });
    });
  }
  async function save(body: unknown) {
    if (!session) { notify(t.loginRequired); setTab('my'); return; }
    await perform(async current => {
      const saved = await api('cases', savedSchema, body);
      if (!current()) return;
      const newRun: Run = { id: saved.analysisRunId, application_case_id: saved.applicationCaseId, product: tier, status: 'PENDING', created_at: new Date().toISOString() };
      setRun(newRun); setQuote(null); setHistory(old => ({ ...old, runs: [newRun, ...old.runs] })); notify(t.saved);
    });
  }
  async function execute() {
    if (!run) return;
    const active = run;
    await perform(async current => {
      await api('execute', z.object({}).passthrough(), { analysisRunId: active.id, retry: active.status === 'FAILED' });
      const loaded = await api(`result?id=${active.id}`, resultResponseSchema);
      if (!current()) return;
      if (loaded.result) { setResult(loaded.result); setRun(null); }
      else setRun({ ...active, status: loaded.status });
    });
  }
  const canExecute = !!run && (['RUNNING', 'FAILED'].includes(run.status) || history.entitlements.some(e => e.application_case_id === run.application_case_id && e.product === run.product));
  const status = (value: string) => value === 'RUNNING' ? t.running : ['COMPLETED','SUCCEEDED'].includes(value) ? t.completed : value === 'FAILED' ? t.failed : t.pending;
  function historyRows() { return history.runs.length ? history.runs.map(item => <Pressable key={item.id} accessibilityRole="button" disabled={busy} onPress={() => void openRun(item)}><Card><View style={ui.between}><Text style={ui.heading}>{item.product}</Text><Text style={ui.muted}>{status(item.status)}</Text></View><Text style={ui.muted}>{new Date(item.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')} · {item.id.slice(0,8)}</Text></Card></Pressable>) : <Card><Icon name="folder-open-outline" size={30}/><Text style={ui.heading}>{t.empty}</Text><Text style={ui.muted}>{t.emptyBody}</Text></Card>; }
  return <SafeAreaView style={ui.page} edges={['top','bottom']}><StatusBar style="dark"/><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.line }}><View style={ui.row}><View style={{ width: 29, height: 29, backgroundColor: colors.green, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.lime, fontSize: 20, fontWeight: '700' }}>m</Text></View><Text style={{ color: colors.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.6 }}>mooa<Text style={{ fontWeight: '400' }}> resume</Text></Text></View><Pressable accessibilityRole="button" accessibilityLabel={t.language} onPress={() => setLocale(locale === 'ko' ? 'en' : 'ko')} style={{ padding: 10 }}><Text style={ui.eyebrow}>{locale === 'ko' ? 'EN' : '한국어'}</Text></Pressable></View>
    {notice ? <Pressable onPress={() => setNotice('')} accessibilityRole="button" style={{ backgroundColor: colors.lime, padding: 14 }}><Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text></Pressable> : null}
    {busy && <View style={{ flexDirection: 'row', gap: 8, padding: 8, justifyContent: 'center' }}><ActivityIndicator color={colors.green}/><Text style={ui.muted}>{t.loading}</Text></View>}
    {result ? <ResultScreen key={result.caseId} result={result} t={t} notify={notify} onBack={() => setResult(null)}/> : run ? <Page><Button secondary title={t.back} disabled={busy} onPress={() => { setRun(null); setQuote(null); }}/><Text style={ui.eyebrow}>{run.product}</Text><Heading title={status(run.status)} subtitle={run.id.slice(0,8)}/><Card><Text style={ui.body}>{t.runNotice}</Text><Button title={run.status === 'FAILED' ? t.retry : run.status === 'RUNNING' ? t.check : t.run} disabled={busy || !canExecute} onPress={() => void execute()}/><Button secondary title={t.refresh} disabled={busy} onPress={() => void openRun(run)}/></Card>{run.status === 'PENDING' && <Card><Text style={ui.muted}>{nativeBillingEnabled ? t.runNotice : t.billingPending}</Text>{nativeBillingEnabled && <><Button secondary title={t.restore} disabled={busy} onPress={() => void perform(async current => { await recoverPurchases(run.id); const updated = await api("history", historySchema); if (current()) { setHistory(updated); notify(t.saved); } })}/><Button title={quote ? `${t.checkout} · ${quote.displayPrice}` : t.checkout} disabled={busy} onPress={() => void perform(async current => { if (!quote) { const prepared = await preparePurchase(run.id); if (current()) setQuote(prepared); } else { await purchase(run.id, quote); const updated = await api("history", historySchema); if (current()) { setHistory(updated); setQuote(null); notify(t.saved); } } })}/></>}</Card>}</Page> : null}
    <View key={generation} style={{ flex: 1, display: result || run ? "none" : "flex" }}>
      <View style={{ flex: 1, display: tab === 'home' ? 'flex' : 'none' }}><Page><Text style={ui.eyebrow}>{t.greeting}</Text><View style={{ backgroundColor: colors.ink, padding: 26, borderRadius: 26, gap: 18, overflow: 'hidden' }}><View pointerEvents="none" style={{ position: 'absolute', width: 210, height: 210, borderWidth: 1, borderColor: '#476756', borderRadius: 110, right: -100, top: -85 }}/><Text style={{ color: colors.lime, fontSize: 11, letterSpacing: 2 }}>MOOA / CAREER COMPANION</Text><Text style={[ui.title, { color: '#F5F7EA', fontSize: 30, lineHeight: 43 }]}>{t.hero}</Text><Text style={{ color: '#C1D0C5', fontSize: 14, lineHeight: 24 }}>{t.heroBody}</Text><Pressable accessibilityRole="button" onPress={() => setTab('review')} style={[ui.button, { backgroundColor: colors.lime, marginTop: 8 }]}><Text style={[ui.buttonText, { color: colors.ink }]}>{t.start}</Text><Icon name="arrow-forward"/></Pressable></View>
      <Heading title={t.tools} subtitle={t.toolsSub}/>{(['QUICK','PRO','FINAL'] as const).map((product, index) => <Pressable accessibilityRole="button" key={product} onPress={() => { setTier(product); setTab('review'); }}><Card><View style={ui.between}><View style={{ flex: 1, gap: 8 }}><Text style={ui.eyebrow}>0{index + 1} / {product}</Text><Text style={ui.heading}>{t[product === 'QUICK' ? 'quick' : product === 'PRO' ? 'pro' : 'final']}</Text><Text style={ui.muted}>{t[product === 'QUICK' ? 'quickBody' : product === 'PRO' ? 'proBody' : 'finalBody']}</Text></View><Icon name="arrow-forward-outline"/></View></Card></Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => setTab('career')}><Card style={{ backgroundColor: colors.pale }}><View style={ui.row}><Icon name="compass-outline" size={30}/><View style={{ flex: 1 }}><Text style={ui.heading}>{t.careerTitle}</Text><Text style={ui.muted}>{t.careerBody}</Text></View><Icon name="arrow-forward"/></View></Card></Pressable><Button secondary title={t.sampleAction} onPress={() => setResult(sampleResult(locale))}/><View style={ui.between}><Text style={ui.heading}>{t.recent}</Text>{session && <Pressable accessibilityRole="button" onPress={() => void refresh()} disabled={busy} style={{ padding: 10 }}><Text style={ui.muted}>{t.refresh}</Text></Pressable>}</View>{historyRows()}<View style={ui.row}><Icon name="shield-checkmark-outline"/><Text style={ui.muted}>{t.private}</Text></View></Page></View>
      <View style={{ flex: 1, display: tab === 'review' ? 'flex' : 'none' }}><ReviewScreen t={t} locale={locale} tier={tier} setTier={setTier} busy={busy} onSave={save} notify={notify}/></View>
      <View style={{ flex: 1, display: tab === 'resume' ? 'flex' : 'none' }}><ResumeScreen t={t} notify={notify}/></View>
      <View style={{ flex: 1, display: tab === 'career' ? 'flex' : 'none' }}><CareerScreen t={t} locale={locale}/></View>
      <View style={{ flex: 1, display: tab === 'my' ? 'flex' : 'none' }}><Page><Text style={ui.eyebrow}>MY MOOA</Text><Heading title={t.account}/><Card><Text style={ui.heading}>{t.language}</Text><View style={ui.row}><Pill title="한국어" active={locale === 'ko'} onPress={() => setLocale('ko')}/><Pill title="English" active={locale === 'en'} onPress={() => setLocale('en')}/></View></Card>{!supabase ? <Card><Text style={ui.body}>{t.config}</Text></Card> : !session ? <Card><Heading title={t.login} subtitle={t.loginBody}/><Field label={t.email} value={email} autoCapitalize="none" keyboardType="email-address" onChangeText={text => { setEmail(text); setCodeSent(false); setCode(''); }}/><Button title={t.sendCode} disabled={busy || !z.email().safeParse(email.trim()).success} onPress={() => void perform(async () => { const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }); if (error) throw error; setCodeSent(true); notify(t.codeSent); })}/>{codeSent && <><Field label={t.code} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8}/><Button title={t.verifyCode} disabled={busy || !/^\d{6,8}$/.test(code)} onPress={() => void perform(async () => { const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' }); if (error) throw error; setCode(''); })}/></>}</Card> : <><Card><Icon name="person-circle-outline" size={40}/><Text style={ui.body}>{session.user.email}</Text><Button secondary title={t.signout} disabled={busy} onPress={() => void perform(async () => { const { error } = await supabase!.auth.signOut(); if (error) throw error; setEmail(''); setCodeSent(false); })}/></Card><Button secondary title={t.refresh} disabled={busy} onPress={() => void refresh()}/><Text style={ui.heading}>{t.passes}</Text>{history.entitlements.length ? history.entitlements.map(e => <Card key={e.id}><Text style={ui.heading}>{e.product}</Text><Text style={ui.muted}>{e.application_case_id.slice(0,8)}</Text></Card>) : <Text style={ui.muted}>{t.noPasses}</Text>}<Text style={ui.heading}>{t.recent}</Text>{historyRows()}</>}<Text style={ui.muted}>{t.privateBody}</Text><Text style={ui.muted}>MOOA Resume · 0.1.0</Text></Page></View>
    </View>
    {!result && !run && <View style={{ flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, paddingBottom: 8 }}>{tabs.map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} accessibilityLabel={t[item.id]} key={item.id} onPress={() => setTab(item.id)} style={{ flex: 1, gap: 5, alignItems: 'center', paddingVertical: 5, minHeight: 52 }}><Icon name={item.icon} color={tab === item.id ? colors.green : '#8E9C94'} size={23}/><Text style={{ fontSize: 11, color: tab === item.id ? colors.green : colors.muted, fontWeight: tab === item.id ? '700' : '400' }}>{t[item.id]}</Text></Pressable>)}</View>}
  </KeyboardAvoidingView></SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><MobileApp/></SafeAreaProvider>; }


