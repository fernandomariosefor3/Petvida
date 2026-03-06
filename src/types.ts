export interface HealthRecord {
  id: string;
  type: 'Consulta' | 'Exame' | 'Medicação' | 'Cirurgia';
  description: string;
  date: string;
}

export interface Vaccine {
  id: string;
  name: string;
  date: string;
  status: 'Aplicada' | 'Agendada' | 'Pendente';
}

export interface PetEvent {
  id: string;
  type: 'Banho' | 'Tosa' | 'Veterinário' | 'Vacina' | 'Passeio' | 'Outro';
  description: string;
  date: string;
  time: string;
}

export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  breed: string;
  weight: string;
  age: string;
  healthRecords: HealthRecord[];
  vaccines: Vaccine[];
}

export interface User {
  id: string;
  name: string;
  email: string;
}
