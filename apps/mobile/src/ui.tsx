import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
export const colors = { ink: '#193C34', green: '#195C48', pale: '#E7EFE5', cream: '#F7F8F2', white: '#FFFFFF', muted: '#65776F', line: '#DEE6DC', lime: '#D8EF9B', amber: '#876330' };
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream }, content: { padding: 24, paddingBottom: 38, gap: 22, width: '100%', maxWidth: 720, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 29, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1, color: colors.ink }, heading: { fontSize: 19, fontWeight: '700', color: colors.ink, lineHeight: 27 },
  body: { fontSize: 15, lineHeight: 24, color: colors.ink }, muted: { fontSize: 13, lineHeight: 21, color: colors.muted }, eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.green },
  card: { borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 20, gap: 12 },
  input: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 14, color: colors.ink, fontSize: 15, minHeight: 50 },
  button: { paddingVertical: 15, paddingHorizontal: 18, borderRadius: 13, backgroundColor: colors.green, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' }, secondary: { backgroundColor: colors.pale }, secondaryText: { color: colors.green },
  pill: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, minHeight: 44 }, activePill: { backgroundColor: colors.green, borderColor: colors.green },
});
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color = colors.green }: { name: IconName; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color}/>; }
export function Page({ children }: { children: ReactNode }) { return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}</ScrollView>; }
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[ui.card, style]}>{children}</View>; }
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={{ gap: 8 }}><Text accessibilityRole="header" style={ui.title}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View>; }
export function Button({ title, onPress, disabled, secondary, icon }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: IconName }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>{icon && <Icon name={icon} color={secondary ? colors.green : colors.white} size={19}/>}<Text style={[ui.buttonText, secondary && ui.secondaryText]}>{title}</Text></Pressable>; }
export function Field({ label, multiline, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 7 }}><Text style={[ui.muted, { fontWeight: '600' }]}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#8C9992" style={[ui.input, multiline && { minHeight: 150, textAlignVertical: 'top', lineHeight: 24 }]} multiline={multiline} {...props}/></View>; }
export function Pill({ title, active, onPress }: { title: string; active?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[ui.pill, active && ui.activePill]}><Text style={{ color: active ? colors.white : colors.green, fontSize: 13, fontWeight: '600' }}>{title}</Text></Pressable>; }
