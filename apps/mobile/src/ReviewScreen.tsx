import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { guestApplicationHandoffSchema } from '../../../src/application/application-case-handoff';
import type { Messages, Locale } from './i18n';
import { Page, Card, Field, Button, Heading, Pill, ui, colors } from './ui';
import { countDisplayLength } from './format';
export type Tier = 'QUICK' | 'PRO' | 'FINAL';
type Question = { id: string; title: string; answer: string; target: string };
export function ReviewScreen({ t, locale, tier, setTier, busy, onSave, notify }: { t: Messages; locale: Locale; tier: Tier; setTier: (tier: Tier) => void; busy: boolean; onSave: (body: unknown) => Promise<void>; notify: (message: string) => void }) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [posting, setPosting] = useState('');
  const [materials, setMaterials] = useState('');
  const [market, setMarket] = useState<'KR' | 'US'>('KR');
  const [questions, setQuestions] = useState<Question[]>([{ id: 'question-1', title: '', answer: '', target: '' }]);
  function change(index: number, key: keyof Question, value: string) { setQuestions(old => old.map((q, i) => i === index ? { ...q, [key]: value } : q)); }
  async function importText(index: number) {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      const cachedFile = Platform.OS === 'web' ? null : new File(asset.uri);
      let text: string;
      try {
        if (!asset.name.toLowerCase().endsWith('.txt') || (asset.size ?? cachedFile?.size ?? 0) > 120000) { notify(t.textOnly); return; }
        text = cachedFile ? await cachedFile.text() : await asset.file!.text();
      } finally { cachedFile?.delete(); }
      if (text.length > 30000) { notify(t.required); return; }
      change(index, 'answer', text);
    } catch { notify(t.failure); }
  }
  async function submit() {
    if (market !== 'KR') { notify(t.marketPending); return; }
    const parsed = guestApplicationHandoffSchema.safeParse({ title, companyName: company, roleName: role, product: tier, writingMode: 'POLISH', writingStyle: 'BALANCED', targetLength: 700,
      questions: questions.map(q => ({ id: q.id, title: q.title, prompt: q.title, answer: q.answer, targetLength: q.target.trim() ? Number(q.target) : null })),
      jobPosting: { text: tier === 'QUICK' ? '' : posting, url: '', filenames: [] },
      candidateMaterials: { schemaVersion: '1.0', freeformNotes: '', experiences: [], profileEntries: [], freeformAttachments: [], materialAttachments: tier !== 'QUICK' && materials.trim() ? [{ kind: 'RESUME', filename: 'resume.txt', extension: 'txt', sizeBytes: new TextEncoder().encode(materials).length, text: materials }] : [] },
    });
    if (!parsed.success || !questions.some(q => q.answer.trim())) { notify(t.required); return; }
    await onSave({ locale: locale === 'ko' ? 'ko-KR' : 'en-US', market, outputLanguage: 'ko', application: parsed.data });
  }
  return <Page><Text style={ui.eyebrow}>APPLICATION STUDIO</Text><Heading title={t.reviewTitle} subtitle={t.reviewBody}/><View style={ui.row}>{(['QUICK','PRO','FINAL'] as const).map(p => <Pill key={p} title={p} active={tier === p} onPress={() => setTier(p)}/>)}</View><Card style={{ backgroundColor: colors.pale }}><Text style={ui.heading}>{t[tier === 'QUICK' ? 'quick' : tier === 'PRO' ? 'pro' : 'final']}</Text><Text style={ui.body}>{t[tier === 'QUICK' ? 'quickBody' : tier === 'PRO' ? 'proBody' : 'finalBody']}</Text></Card><Text style={ui.muted}>{t.memory}</Text>
    <Field label={t.applicationTitle} value={title} onChangeText={setTitle} maxLength={120}/><Field label={t.company} value={company} onChangeText={setCompany} maxLength={120}/><Field label={t.role} value={role} onChangeText={setRole} maxLength={120}/>
    <Text style={ui.heading}>{t.market}</Text><View style={{ gap: 8 }}><Pill title={t.krMarket} active={market === 'KR'} onPress={() => setMarket('KR')}/><Pill title={t.enMarket} active={market === 'US'} onPress={() => setMarket('US')}/></View>{market === 'US' && <Text style={[ui.body, { color: colors.amber }]}>{t.marketPending}</Text>}
    {questions.map((q, i) => <Card key={q.id}><View style={ui.between}><Text style={ui.eyebrow}>{t.question} {i + 1}</Text>{questions.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`${t.remove} ${i + 1}`} onPress={() => setQuestions(old => old.filter(item => item.id !== q.id))} style={{ padding: 12 }}><Text style={ui.muted}>{t.remove}</Text></Pressable>}</View><Field label={t.prompt} value={q.title} onChangeText={text => change(i, 'title', text)} maxLength={120}/><Field label={t.answer} multiline value={q.answer} onChangeText={text => change(i, 'answer', text)} maxLength={30000}/><Text style={ui.muted}>{countDisplayLength(q.answer, locale).toLocaleString()} {locale === 'en' ? 'words' : '자'}</Text><Field label={t.target} value={q.target} keyboardType="number-pad" onChangeText={text => change(i, 'target', text)} maxLength={4}/><Button secondary title={t.import} icon="document-attach-outline" onPress={() => void importText(i)}/></Card>)}
    <Button secondary title={t.addQuestion} disabled={questions.length >= 20} onPress={() => setQuestions(old => [...old, { id: `question-${Date.now()}`, title: '', answer: '', target: '' }])}/>
    {tier !== 'QUICK' && <><Field label={t.posting} multiline value={posting} onChangeText={setPosting} maxLength={20000}/><Field label={t.materials} multiline value={materials} onChangeText={setMaterials} maxLength={50000}/></>}
    <Text style={ui.muted}>{t.privateBody}</Text><Button title={busy ? t.loading : t.save} disabled={busy || market !== 'KR'} onPress={() => void submit()} icon="lock-closed-outline"/>
  </Page>;
}

