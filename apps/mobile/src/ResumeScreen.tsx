import { useState } from 'react';
import { Text, View, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { Messages } from './i18n';
import { emptyResume, resumeHtml } from './format';
import { Page, Card, Heading, Field, Button, ui } from './ui';
export function ResumeScreen({ t, notify }: { t: Messages; notify: (message: string) => void }) {
  const [draft, setDraft] = useState(emptyResume);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  async function exportPdf() {
    setBusy(true);
    try {
      if (Platform.OS === 'web') await Print.printAsync({ html: resumeHtml(draft, t) });
      else {
        const result = await Print.printToFileAsync({ html: resumeHtml(draft, t) });
        try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }); else await Print.printAsync({ uri: result.uri }); }
        finally { new File(result.uri).delete(); }
      }
    } catch { notify(t.failure); } finally { setBusy(false); }
  }
  return <Page><Text style={ui.eyebrow}>YOUR STORY, ONE PAGE</Text><Heading title={t.resumeTitle} subtitle={t.resumeBody}/><Text style={ui.muted}>{t.resumeNote}</Text><Text style={ui.muted}>{t.memory}</Text>{(['name','email','headline','experience','education','skills'] as const).map(key => <Field key={key} label={t[key]} value={draft[key]} onChangeText={text => setDraft(old => ({ ...old, [key]: text }))} multiline={['experience','education','skills'].includes(key)} keyboardType={key === 'email' ? 'email-address' : 'default'} maxLength={key === 'name' || key === 'email' ? 120 : 12000}/>)}<Button secondary title={t.preview} icon="eye-outline" onPress={() => setPreview(!preview)}/>{preview && <Card><Text style={ui.title}>{draft.name}</Text><Text style={ui.muted}>{draft.email}</Text><Text style={ui.body}>{draft.headline}</Text>{(['experience','education','skills'] as const).map(key => draft[key] ? <View key={key} style={{ gap: 8 }}><Text style={ui.heading}>{t[key]}</Text><Text style={ui.body}>{draft[key]}</Text></View> : null)}</Card>}<Button title={busy ? t.loading : t.pdf} disabled={busy || !draft.name.trim()} onPress={() => void exportPdf()} icon="download-outline"/><Text style={ui.muted}>{t.aiResumePending}</Text></Page>;
}
