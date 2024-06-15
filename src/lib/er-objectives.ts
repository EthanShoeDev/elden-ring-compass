export const ELDEN_RING_OBJECTIVES = [
  {
    name: 'West Limgrave',
    level: '1~15',
    upgrades: '+0 ~+1',
    objectives: [
      {
        label: 'Start Various Quests',
        location: [1.23, 2.34],
        automated_checks: [], // unknown offsets
      },
      {
        label: 'Buy Essential Gear',
        location: [1.23, 2.34],
        automated_checks: [{ type: 'item', name: 'Craftting Kit' }],
      },
    ],
  },
];
