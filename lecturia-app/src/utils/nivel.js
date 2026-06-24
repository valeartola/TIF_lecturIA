// Helpers de nivel compartidos entre Docente y Estudiante
import { C } from '../constants/colors';

export const nivelLabel = (n) => ({ 'FÁCIL': 'Básico', 'MEDIA': 'Intermedio', 'DIFÍCIL': 'Avanzado' }[n] || n || '—');

export const levelColor = (l) => ({ Avanzado: C.green, Intermedio: C.yellow, Básico: C.red }[l] || C.gray);

export const levelBg = (l) => ({ Avanzado: '#E8F5EB', Intermedio: '#FFF8E1', Básico: '#FEECEC' }[l] || '#eee');

export const nivelColor = (n) => ({ 'FÁCIL': C.green, 'MEDIA': C.yellow, 'DIFÍCIL': C.red }[n] || C.gray);
