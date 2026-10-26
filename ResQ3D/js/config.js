const B = {
  X0: -18, X1: 18, Z0: -10, Z1: 10,
  CZ0: -2.5, CZ1: 2.5,
  WALL_T: 0.12, INSET: 0.06, SLAB_T: 0.32
};
const FLOOR_Y = [0, 4.5, 8.5, 12.5, 16.5];
const FLOOR_H = [4.5, 4.0, 4.0, 4.0, 4.0];
const ROOF_Y  = 20.5;
const LEVEL_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];
const LEVEL_TAGS  = ['G', '1', '2', '3', '4'];

const NORTH_SLOTS = {
  N1: { x1: -13, x2: -7, z1: B.Z0, z2: B.CZ0 },
  N2: { x1: -7, x2: -2, z1: B.Z0, z2: B.CZ0 },
  N3: { x1: 2, x2: 10, z1: B.Z0, z2: B.CZ0 },
  N4: { x1: 10, x2: 18, z1: B.Z0, z2: B.CZ0 }
};
const SOUTH_SLOTS = {
  S1: { x1: -18, x2: -11, z1: B.CZ1, z2: B.Z1 },
  S2: { x1: -11, x2: -4, z1: B.CZ1, z2: B.Z1 },
  S3: { x1: -4, x2: 4, z1: B.CZ1, z2: B.Z1 },
  S4: { x1: 4, x2: 13, z1: B.CZ1, z2: B.Z1 }
};
const STAIR_A = { x1: -18, x2: -13, z1: -10, z2: -2.5 };
const STAIR_B = { x1: 13, x2: 18, z1: 2.5, z2: 10 };
const ELEV    = { x1: -2, x2: 2, z1: -10, z2: -6 };
const ELEV_LOBBY = { x1: -2, x2: 2, z1: -6, z2: -2.5 };

const ROOM_TYPES = {
  class:   { color: 0x4a90d9, label: 'Classroom', tag: 'ACADEMIC' },
  lab:     { color: 0x27ae60, label: 'Laboratory', tag: 'LAB' },
  faculty: { color: 0xe67e22, label: 'Faculty Room', tag: 'STAFF' },
  office:  { color: 0x9b59b6, label: 'Office', tag: 'ADMIN' },
  wash:    { color: 0x1abc9c, label: 'Washroom', tag: 'FACILITY' },
  storage: { color: 0x7f8c8d, label: 'Storage', tag: 'SERVICE' },
  seminar: { color: 0xe74c3c, label: 'Seminar Hall', tag: 'EVENT' },
  common:  { color: 0xf1c40f, label: 'Common Area', tag: 'PUBLIC' },
  lobby:   { color: 0x16a085, label: 'Lobby', tag: 'PUBLIC' }
};

const FLOOR_PROGRAMME = [
  [
    { slot: 'N1', id: 'GROUND_ADMIN',    name: 'Administration Office',      type: 'office'  },
    { slot: 'N2', id: 'GROUND_SECURITY', name: 'Security & CCTV Room',       type: 'office'  },
    { slot: 'N3', id: 'GROUND_LAB_01',   name: 'Computer Laboratory',        type: 'lab'     },
    { slot: 'N4', id: 'GROUND_FACULTY',  name: 'Faculty Room',               type: 'faculty' },
    { slot: 'S1', id: 'GROUND_CLASS_01', name: 'Classroom G-01',             type: 'class'   },
    { slot: 'S2', id: 'GROUND_WASHROOM', name: 'Washrooms',                  type: 'wash'    },
    { slot: 'S3', id: 'GROUND_LOBBY',    name: 'Entrance Lobby & Reception', type: 'lobby', mainEntrance: true },
    { slot: 'S4', id: 'GROUND_WAITING',  name: 'Waiting Area',               type: 'common'  }
  ],
  [
    { slot: 'N1', id: 'F1_CLASS_01',  name: 'Classroom 101',       type: 'class'   },
    { slot: 'N2', id: 'F1_CLASS_02',  name: 'Classroom 102',       type: 'class'   },
    { slot: 'N3', id: 'F1_LAB_01',    name: 'Computer Laboratory', type: 'lab'     },
    { slot: 'N4', id: 'F1_FACULTY',   name: 'Faculty Room',        type: 'faculty' },
    { slot: 'S1', id: 'F1_CLASS_03',  name: 'Classroom 103',       type: 'class'   },
    { slot: 'S2', id: 'F1_SEMINAR',   name: 'Seminar Room',        type: 'seminar' },
    { slot: 'S3', id: 'F1_STORAGE',   name: 'Storage Room',        type: 'storage' },
    { slot: 'S4', id: 'F1_WASHROOM',  name: 'Washrooms',           type: 'wash'    }
  ],
  [
    { slot: 'N1', id: 'F2_CLASS_01',  name: 'Classroom 201',          type: 'class'   },
    { slot: 'N2', id: 'F2_CLASS_02',  name: 'Classroom 202',          type: 'class'   },
    { slot: 'N3', id: 'F2_LAB_01',    name: 'Large Computer Lab',     type: 'lab'     },
    { slot: 'N4', id: 'F2_FACULTY',   name: 'Faculty Room',           type: 'faculty' },
    { slot: 'S1', id: 'F2_CLASS_03',  name: 'Classroom 203',          type: 'class'   },
    { slot: 'S2', id: 'F2_LAB_02',    name: 'Project / Research Lab', type: 'lab'     },
    { slot: 'S3', id: 'F2_STORAGE',   name: 'Storage Room',           type: 'storage' },
    { slot: 'S4', id: 'F2_WASHROOM',  name: 'Washrooms',              type: 'wash'    }
  ],
  [
    { slot: 'N1', id: 'F3_LAB_ADV',   name: 'Advanced Computer Lab', type: 'lab'     },
    { slot: 'N2', id: 'F3_IOT_LAB',   name: 'Electronics / IoT Lab', type: 'lab'     },
    { slot: 'N3', id: 'F3_CLASS_01',  name: 'Classroom 301',         type: 'class'   },
    { slot: 'N4', id: 'F3_FACULTY',   name: 'Faculty Room',          type: 'faculty' },
    { slot: 'S1', id: 'F3_CLASS_02',  name: 'Classroom 302',         type: 'class'   },
    { slot: 'S2', id: 'F3_SEMINAR',   name: 'Seminar Room',          type: 'seminar' },
    { slot: 'S3', id: 'F3_STORAGE',   name: 'Storage Room',          type: 'storage' },
    { slot: 'S4', id: 'F3_WASHROOM',  name: 'Washrooms',             type: 'wash'    }
  ],
  [
    { slot: 'N1', id: 'F4_SEMINAR_HALL', name: 'Multipurpose Seminar Hall', type: 'seminar',
      span: { x1: -13, x2: -2, z1: B.Z0, z2: B.CZ0 } },
    { slot: 'N3', id: 'F4_TRAINING_01',  name: 'Training Room 401',         type: 'class'   },
    { slot: 'N4', id: 'F4_FACULTY',      name: 'Faculty Room',              type: 'faculty' },
    { slot: 'S1', id: 'F4_TRAINING_02',  name: 'Training Room 402',         type: 'class'   },
    { slot: 'S2', id: 'F4_PROJECT_LAB',  name: 'Research / Project Lab',    type: 'lab'     },
    { slot: 'S3', id: 'F4_MEETING',      name: 'Meeting Room',              type: 'office'  },
    { slot: 'S4', id: 'F4_STORAGE',      name: 'Storage Room',              type: 'storage' }
  ]
];

export { B, FLOOR_Y, FLOOR_H, ROOF_Y, LEVEL_NAMES, LEVEL_TAGS, NORTH_SLOTS, SOUTH_SLOTS, STAIR_A, STAIR_B, ELEV, ELEV_LOBBY, ROOM_TYPES, FLOOR_PROGRAMME };
