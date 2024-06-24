/* eslint-disable no-useless-escape */
type Region = {
  name: string;
  level: string;
  upgrades: string;
  overview: Array<string>;
  detailed: Array<DetailedStep>;
};

type DetailedStep = {
  description: string; // markdown
  objectives: Array<Objective>;
};

type GenericObjective = {
  label: string;
  recommendedLevel?: number;
  notes?: string;
  tags?: Array<string>;
  items?: Array<EldenRingObjectiveItem>;
};

type NPCObjective = GenericObjective & {
  npc: string;
  boss: never;
  location: never;
};

type LocationObjective = GenericObjective & {
  location: string;
  boss: never;
  npc: never;
};

type BossObjective = GenericObjective & {
  boss: string;
  location: never;
  npc: never;
};

export function objectiveType(obj: Objective): string {
  if ('boss' in obj) return 'boss';
  if ('npc' in obj) return 'npc';
  if ('location' in obj) return 'location';
  return 'generic';
}

type Objective =
  | NPCObjective
  | LocationObjective
  | BossObjective
  | GenericObjective;

export type EldenRingObjectiveItem = {
  name: string;
  notes?: string;
  href?: string;
};

export const ELDEN_RING_OBJECTIVES: Array<Region> = [
  {
    name: 'West Limgrave',
    level: '1~15',
    upgrades: '+0 ~ +1',
    overview: [
      `Buy Essential Gear`,
      `Obtain Limgrave West Map Fragment`,
      `Obtain Whetstone Knife`,
      `Unlock Torrent & Spirit Bell`,
      `Do Boc the Seamster's Quest`,
      `Defeat Night's Cavalry.`,
      `Find Sorceress Sellen (if you're a mage)`,
      `Talk to Roderika`,
      `Find Ashes of War Merchant`,
      `Meet Potboy (Alexander)`,
      `Talk to D, Hunter of the Dead`,
      `Complete Murkwater Cave`,
    ],
    detailed: [
      {
        description: `[Elden Ring Map: Limgrave Region starting point](https://eldenring.wiki.fextralife.com/Interactive+Map?id=457&lat=-195.257812&lng=100.316924&code=mapA "Elden Ring Interactive Map?id=457&lat=-195.257812&lng=100.316924&code=mapA"). Limgrave has a lot of places to visit, but only a few of them are essential. Right next to the First Step Site of Grace you'll find [White Mask Varre](https://eldenring.wiki.fextralife.com/White+Mask+Varre "Elden Ring White Mask Varre"). Exhaust his dialogue for some info about the world and to start his quest. Your first step will be to head to [Church of Elleh](https://eldenring.wiki.fextralife.com/Church+of+Elleh "Elden Ring Church of Elleh") and meet [Merchant Kale](https://eldenring.wiki.fextralife.com/Merchant+Kale "Elden Ring Merchant Kale"), one of the [Nomadic Merchants](https://eldenring.wiki.fextralife.com/Nomadic+Merchants "Elden Ring Nomadic Merchants") of the game. Patrolling between the starting point and the church is a [Tree Sentinel](https://eldenring.wiki.fextralife.com/Tree+Sentinel "Elden Ring Tree Sentinel") boss. He will be extremely difficult at this stage of the game, so it is _strongly_ suggested to avoid him until you unlock your horse and become stronger. Defeating him rewards you with his [Golden Halberd](https://eldenring.wiki.fextralife.com/Golden+Halberd "Elden Ring Golden Halberd"). At the church, buy the [Crafting Kit](https://eldenring.wiki.fextralife.com/Crafting+Kit "Elden Ring Crafting Kit") Kale offers, a [Torch](https://eldenring.wiki.fextralife.com/Torch "Elden Ring Torch"), and the [Telescope](https://eldenring.wiki.fextralife.com/Telescope "Elden Ring Telescope"). Also make note of the nearby upgrade bench. You can do optional cave and catacomb objectives to gain talismans and materials as needed.`,
        objectives: [
          {
            label: 'Speak to White Mask Varre',
            npc: 'White Mask Varre',
            tags: ['NPC', 'Quest'],
          },
          {
            label: 'Defeat Tree Sentinel',
            boss: 'Tree Sentinel',
            recommendedLevel: 15,
            notes: 'Recommended to skip and come back later',
          },
          {
            label: 'Meet Merchant Kale',
            npc: 'Merchant Kale',
            tags: ['NPC', 'Merchant'],
            notes: 'Buy essential gear',
            items: [
              {
                name: 'Crafting Kit',
              },
              {
                name: 'Torch',
              },
              {
                name: 'Telescope',
              },
            ],
          },
        ],
      },
      {
        description: `Head over to [Gatefront Ruins](https://eldenring.wiki.fextralife.com/Gatefront+Ruins "Elden Ring Gatefront Ruins") and obtain the Limgrave West map fragment for the area. Also pick up the [Whetstone Knife](https://eldenring.wiki.fextralife.com/Whetstone+Knife "Elden Ring Whetstone Knife") so you can use [Skills](https://eldenring.wiki.fextralife.com/Skills "Elden Ring Skills") in your weapon, and get [Ash of War: Storm Stomp](https://eldenring.wiki.fextralife.com/Ash+of+War:+Storm+Stomp "Elden Ring Ash of War: Storm Stomp") from an underground chest.`,
        objectives: [
          {
            label: 'Discover location Gatefront Ruins',
            location: 'Gatefront Ruins',
            items: [
              {
                name: 'Limgrave West Map Fragment',
                href: 'https://eldenring.wiki.fextralife.com/Map+(Limgrave,+West)',
              },
              {
                name: 'Whetstone Knife',
              },
              {
                name: 'Ash of War: Storm Stomp',
                notes: 'Underground chest',
              },
            ],
          },
        ],
      },
      {
        description: `Visit 3 sites of grace, or rest in the [Gatefront Site of Grace](https://eldenring.wiki.fextralife.com/Interactive+Map?id=403&code=mapA "Elden Ring Interactive Map?id=403&code=mapA") to speak with Melina and unlock [Torrent](https://eldenring.wiki.fextralife.com/Torrent+\(Spirit+Steed\) "Elden Ring Torrent (Spirit Steed)"), your mount. After this, **teleport** to the Church of Elleh Site of Grace to meet [Renna](https://eldenring.wiki.fextralife.com/Renna "Elden Ring Renna"), and unlock the [Spirit Calling Bell](https://eldenring.wiki.fextralife.com/Spirit+Calling+Bell "Elden Ring Spirit Calling Bell") and get the [Lone Wolf Ashes](https://eldenring.wiki.fextralife.com/Lone+Wolf+Ashes "Elden Ring Lone Wolf Ashes").`,
        objectives: [
          {
            label: 'Speak with Melina and unlock Torrent',
            npc: 'Melina',
            tags: ['NPC', 'Quest'],
            notes: 'Visit 3 sites of grace or rest at Gatefront Site of Grace',
            items: [
              {
                name: 'Spectral Steed Whistle',
              },
            ],
          },
          {
            label: 'Unlock Spirit Calling Bell',
            npc: 'Renna',
            tags: ['NPC', 'Quest'],
            notes: 'Teleport to Church of Elleh Site of Grace',
            items: [
              {
                name: 'Spirit Calling Bell',
              },
              {
                name: 'Lone Wolf Ashes',
              },
            ],
          },
        ],
      },
      {
        description: `South-east from Gatefront Ruins (past east of the telescope on the map), you'll hear a shout belonging to [Boc the Seamster](https://eldenring.wiki.fextralife.com/Boc+the+Seamster "Elden Ring Boc the Seamster"). He's been transformed into a small red tree, so hit the small tree once and talk to him to begin his questline (see [Side Quests](https://eldenring.wiki.fextralife.com/Side+Quests "Elden Ring Side Quests") for other quests). This quest will take you to the [Coastal Cave](https://eldenring.wiki.fextralife.com/Coastal+Cave "Elden Ring Coastal Cave") (southern portion of the western beach), which also unlocks access to the [Church of Dragon Communion](https://eldenring.wiki.fextralife.com/Church+of+Dragon+Communion "Elden Ring Church of Dragon Communion") (if you continue further in the cave without exiting it via portal). Defeat the demi-humans in the Coastal Cave, then go back to Boc at the entrance to return his [Sewing Needle](https://eldenring.wiki.fextralife.com/Sewing+Needle "Elden Ring Sewing Needle") and [Tailoring Tools](https://eldenring.wiki.fextralife.com/Tailoring+Tools "Elden Ring Tailoring Tools"). South-east from Boc's first location, a [Night's Cavalry](https://eldenring.wiki.fextralife.com/Night's+Cavalry "Elden Ring Night's Cavalry") will spawn during night right on the bridge. Defeating him awards the [Ash of War: Repeating Thrust](https://eldenring.wiki.fextralife.com/Ash+of+War:+Repeating+Thrust "Elden Ring Ash of War: Repeating Thrust").`,
        objectives: [
          {
            label: 'Speak with Boc the Seamster',
            npc: 'Boc the Seamster',
            tags: ['NPC', 'Side Quest'],
            notes:
              'Hit the small tree once near Gatefront Ruins. You can hear him shout.',
          },
          {
            label: 'Discover location Coastal Cave',
            location: 'Coastal Cave',
          },
          {
            label: "Get Boc's Sewing Needle and Tailoring Tools",
            items: [
              {
                name: 'Sewing Needle',
              },
              {
                name: 'Tailoring Tools',
              },
            ],
            tags: ['Side Quest', 'Boc the Seamster'],
          },
        ],
      },
      {
        description: `If you are a mage or intend to learn sorceries, you will want to unlock [Sorceress Sellen](https://eldenring.wiki.fextralife.com/Sorceress+Sellen "Elden Ring Sorceress Sellen") in [Waypoint Ruins](https://eldenring.wiki.fextralife.com/Waypoint+Ruins "Elden Ring Waypoint Ruins") - follow the road south from Gatefront Ruins to find it. She's past the [Mad Pumkin Head](https://eldenring.wiki.fextralife.com/Mad+Pumpkin+Head "Elden Ring Mad Pumpkin Head") Boss fight.`,
        objectives: [
          {
            label: 'Boss Fight: Mad Pumkin Head',
            boss: 'Mad Pumkin Head',
          },
          {
            label: 'Speak with Sorceress Sellen',
            npc: 'Sorceress Sellen',
            tags: ['NPC', 'Mage'],
          },
        ],
      },
      {
        description: `Head towards [Stormhill](https://eldenring.wiki.fextralife.com/Stormhill "Elden Ring Stormhill") (past the Gatefront grace leading west) and talk to [Roderika](https://eldenring.wiki.fextralife.com/Roderika "Elden Ring Roderika") to begin her quest and receive the Sitting Sideways gesture, alongside the [Spirit Jellyfish Ashes](https://eldenring.wiki.fextralife.com/Spirit+Jellyfish+Ashes "Elden Ring Spirit Jellyfish Ashes"). If you want to see Roderika's quest in it's entirety, make sure to complete [Stormveil Castle](https://eldenring.wiki.fextralife.com/Stormveil+Castle "Elden Ring Stormveil Castle") before visiting the [Roundtable Hold](https://eldenring.wiki.fextralife.com/Roundtable+Hold "Elden Ring Roundtable Hold") for the first time. You will pick up a [Golden Seed](https://eldenring.wiki.fextralife.com/Golden+Seed "Elden Ring Golden Seed") just before arriving at [Stormhill Shack](https://eldenring.wiki.fextralife.com/Stormhill+Shack "Elden Ring Stormhill Shack"). There's also a [Stonesword Key](https://eldenring.wiki.fextralife.com/Stonesword+Key "Elden Ring Stonesword Key") here that you will want to start collecting.`,
        objectives: [
          {
            label: 'Speak with Roderika',
            npc: 'Roderika',
            tags: ['NPC', 'Quest'],
            items: [
              {
                name: 'Sitting Sideways gesture',
              },
              {
                name: 'Spirit Jellyfish Ashes',
              },
            ],
          },
          {
            label: 'Complete Stormveil Castle',
            notes:
              'To complete Roderika quest, complete before Roundtable Hold',
          },
        ],
      },
      {
        description: `Follow the road East from the [Stormhill Shack](https://eldenring.wiki.fextralife.com/Stormhill+Shack "Elden Ring Stormhill Shack") in Stormhill and you'll come to [Warmaster's Shack](https://eldenring.wiki.fextralife.com/Warmaster's+Shack "Elden Ring Warmaster's Shack"), where you can purchase Ashes of War from [Knight Bernahl](https://eldenring.wiki.fextralife.com/Knight+Bernahl "Elden Ring Knight Bernahl"). At night, Bernahl will be gone, and a [Bell Bearing Hunter](https://eldenring.wiki.fextralife.com/Bell+Bearing+Hunter "Elden Ring Bell Bearing Hunter") boss will spawn as you enter the shack. Note that this boss may be extremely challenging at this point in the game. Defeating him awards the [Bone Peddler's Bell Bearing](https://eldenring.wiki.fextralife.com/Bone+Peddler's+Bell+Bearing "Elden Ring Bone Peddler's Bell Bearing"). Similar to ashes hunter badges in previous games, [Bell Bearings](https://eldenring.wiki.fextralife.com/Bell+Bearings "Elden Ring Bell Bearings") unlock new items in the game's primary shop when given to the [Twin Maiden Husks](https://eldenring.wiki.fextralife.com/Twin+Maiden+Husks "Elden Ring Twin Maiden Husks") after you arrive at [Roundtable Hold](https://eldenring.wiki.fextralife.com/Roundtable+Hold "Elden Ring Roundtable Hold"). Just south from here in the hills where the trolls are, you can visit at night and be invaded by a [Deathbird](https://eldenring.wiki.fextralife.com/Deathbird "Elden Ring Deathbird") mini-boss and get the [Blue-Feathered Branchsword](https://eldenring.wiki.fextralife.com/Blue-Feathered+Branchsword "Elden Ring Blue-Feathered Branchsword") talisman.`,
        objectives: [
          {
            label: 'Purchase Ashes of War',
            npc: 'Knight Bernahl',
            tags: ['NPC', 'Merchant'],
          },
          {
            label: 'Defeat Bell Bearing Hunter',
            boss: 'Bell Bearing Hunter',
            recommendedLevel: 15,
            notes: 'Recommended to skip and come back later',
            items: [
              {
                name: "Bone Peddler's Bell Bearing",
              },
            ],
          },
          {
            label: 'Defeat Deathbird',
            boss: 'Deathbird',
            recommendedLevel: 15,
            notes: 'Recommended to skip and come back later',
            items: [
              {
                name: 'Blue-Feathered Branchsword',
              },
            ],
          },
        ],
      },
      {
        description: `Continue northeast along the road from Warmaster's Shack and turn right as you see a bridge and hear someone shouting. There is a small path to take up the cliff to your right hand side. You will meet [Alexander (Potboy)](https://eldenring.wiki.fextralife.com/Iron+Fist+Alexander "Elden Ring Iron Fist Alexander") and can free him to begin his quest and earn the Triumphant Delight gesture and 1x [Exalted Flesh](https://eldenring.wiki.fextralife.com/Exalted+Flesh "Elden Ring Exalted Flesh"). You have to hit him with a heavy attack or several times from behind.`,
        objectives: [
          {
            label: 'Speak with Alexander (Potboy)',
            npc: 'Alexander (Potboy)',
            tags: ['NPC', 'Quest'],
            items: [
              {
                name: 'Triumphant Delight gesture',
              },
              {
                name: 'Exalted Flesh',
              },
            ],
          },
        ],
      },
      {
        description: `Before we proceed, there's another dungeon nearby with useful loot, especially if you're going for an assassin type class. Return a bit west, to the barricades you passed through where you just fought the dog and commoners. Leave the barricades and head east along the road towards the bridge again. This time stick to the left of the road. Before the bridge, follow the path next to the cliff and you will find [Deathtouched Catacombs](https://eldenring.wiki.fextralife.com/Deathtouched+Catacombs "Elden Ring Deathtouched Catacombs"). Inside there will be gathering/farm materials, upgrade materials, an [Uchigatana](https://eldenring.wiki.fextralife.com/Uchigatana "Elden Ring Uchigatana"), the talisman [Assassin's Crimson Dagger](https://eldenring.wiki.fextralife.com/Assassin's+Crimson+Dagger "Elden Ring Assassin's Crimson Dagger") and a [Deathroot](https://eldenring.wiki.fextralife.com/Deathroot "Elden Ring Deathroot").`,
        objectives: [
          {
            label: 'Discover location Deathtouched Catacombs',
            location: 'Deathtouched Catacombs',
          },
        ],
      },
      {
        description: `Further down the road, past the bridge, you can meet [D, Hunter of the Dead](https://eldenring.wiki.fextralife.com/D,+Hunter+of+the+Dead "Elden Ring D, Hunter of the Dead"), and begin his quest (if you already reached the Roundtable Hold before this point, he will not show up since you would have first met him at the hold instead of near past the bridge, but quest progression remains the same).`,
        objectives: [
          {
            label: 'Speak with D, Hunter of the Dead',
            npc: 'D, Hunter of the Dead',
            tags: ['NPC', 'Quest'],
          },
        ],
      },
      {
        description: `You will now want to return to the lower area of Limgrave, to go up the ravine from Agheel Lake until you find [Murkwater Cave](https://eldenring.wiki.fextralife.com/Murkwater+Cave "Elden Ring Murkwater Cave") that has a special surprise, and then [Murkwater Catacombs](https://eldenring.wiki.fextralife.com/Murkwater+Catacombs "Elden Ring Murkwater Catacombs"). You will get invaded here, so be careful! If you wait a bit to defeat the invader, [Bloody Finger Hunter Yura](https://eldenring.wiki.fextralife.com/Bloody+Finger+Hunter+Yura "Elden Ring Bloody Finger Hunter Yura") will show up to help you defeat him. You can meet him back north of Murkwater Cave afterwards, where you can exhaust his dialogue to start his quest.`,
        objectives: [
          {
            label: 'Discover location Murkwater Cave',
            location: 'Murkwater Cave',
          },
          {
            label: 'Discover location Murkwater Catacombs',
            location: 'Murkwater Catacombs',
          },
          {
            label: 'Defeat Bloody Finger Hunter Yura',
            boss: 'Bloody Finger Hunter Yura',
          },
        ],
      },
    ],
  },
];
