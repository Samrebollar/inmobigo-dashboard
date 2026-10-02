import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Colores del diseño "Residentes InmobiGo" (Figma). */
export const colors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F5',
  text: '#191C1D',
  textMuted: '#434655',
  textSubtle: 'rgba(67,70,85,0.6)',
  placeholder: '#6B7280',
  border: '#C3C6D7',
  borderSoft: 'rgba(195,198,215,0.1)',
  borderSofter: 'rgba(195,198,215,0.2)',
  primary: '#004AC6',
  primaryButton: '#2563EB',
  primaryButtonText: '#EEEFFF',
  primaryTint: 'rgba(0,74,198,0.05)',
  track: '#E5E7EB',
  successBg: '#F0FDF4',
  successBorder: '#DCFCE7',
  successDot: '#4ADE80',
  successText: '#166534',
  warningBg: '#FFFBEB',
  warningBorder: '#FEF3C7',
  warningDot: '#F59E0B',
  warningText: '#92400E',
  dangerBg: '#FFDAD6',
  dangerBorder: '#FECACA',
  dangerDot: '#EF4444',
  dangerText: '#93000A',
  white: '#FFFFFF',
} as const;

/** Familias Inter cargadas en el layout raíz. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 9999 } as const;

/** Sombra suave del diseño: 0 4 20 -2 rgba(0,0,0,0.05). */
export const softShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: { boxShadow: '0px 4px 20px -2px rgba(0,0,0,0.05)' },
}) as ViewStyle;

/** Etiqueta en mayúsculas espaciada (SALDO ACTUAL, ACCESO RÁPIDO, ...). */
export const overline = (size: number, spacing: number, color: string = colors.textMuted): TextStyle => ({
  fontFamily: fonts.bold,
  fontSize: size,
  letterSpacing: spacing,
  textTransform: 'uppercase',
  color,
});
