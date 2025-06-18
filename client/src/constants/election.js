// Constants for election levels and candidate roles
export const ELECTION_LEVELS = [
  'presidencial',
  'senatorial',
  'diputados',
  'municipal'
];

// Roles allowed per election level
export const LEVEL_ROLES = {
  presidencial: ['presidente', 'vicepresidente'],
  senatorial: ['senador'],
  diputados: [
    'diputado territorial',
    'diputado nacional',
    'diputado exterior'
  ],
  municipal: ['alcalde', 'vicealcalde', 'regidor', 'director', 'vocal']
};
