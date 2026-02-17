// data/assignmentRoomsSeed.js
// Semilla para las habitaciones de asignacion (Casa Hotel y Boutique)

const ASSIGNMENT_ROOMS_SEED = [
  // CASA HOTEL - STANDARD (Standard Suite)
  {
    roomId: 'CH1',
    name: 'Hab 1 San Jose',
    number: '1',
    m2: '47 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: 'SALIDA JARDIN',
    type: 'casa_hotel',
    roomType: { type: 'STANDARD', lugar: 'casaHotel' },
    isActive: true,
    order: 1
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH2',
    name: 'Hab 2 San Juan',
    number: '2',
    m2: '56 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 2
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH3',
    name: 'Hab 3 San Carlos',
    number: '3',
    m2: '51 m2',
    bed: 'KING',
    capacity: 2,
    description: 'DOS CAMAS QUEEN SIZE',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 3
  },
  // CASA HOTEL - MASTER (Master Suite)
  {
    roomId: 'CH4',
    name: 'Hab 4 Santa Maria',
    number: '4',
    m2: '67 m2',
    bed: 'DOBLE',
    capacity: 4,
    description: 'CAMA KING + QUEEN SIZE',
    type: 'casa_hotel',
    roomType: { type: 'MASTER', lugar: 'casaHotel' },
    isActive: true,
    order: 4
  },
  // CASA HOTEL - MASTER (Master Suite)
  {
    roomId: 'CH5',
    name: 'Hab 5 San Alejandro',
    number: '5',
    m2: '68 m2',
    bed: 'DOBLE',
    capacity: 4,
    description: 'CAMA KING + QUEEN SIZE',
    type: 'casa_hotel',
    roomType: { type: 'MASTER', lugar: 'casaHotel' },
    isActive: true,
    order: 5
  },
  // CASA HOTEL - MASTER (Master Suite)
  {
    roomId: 'CH6',
    name: 'Hab 6 San Rafael',
    number: '6',
    m2: '54 m2',
    bed: 'DOBLE',
    capacity: 4,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'MASTER', lugar: 'casaHotel' },
    isActive: true,
    order: 6
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH7',
    name: 'Hab 7 Santa Glafira',
    number: '7',
    m2: '42 m2',
    bed: 'KING',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 7
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH8',
    name: 'Hab 8 Santa Trinidad',
    number: '8',
    m2: '40 m2',
    bed: 'KING',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 8
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH9',
    name: 'Hab 9 Santa Socorro',
    number: '9',
    m2: '41 m2',
    bed: 'KING',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 9
  },
  // CASA HOTEL - STANDARD (Standard Suite)
  {
    roomId: 'CH10',
    name: 'Hab 10 Santa Esther',
    number: '10',
    m2: '25 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'STANDARD', lugar: 'casaHotel' },
    isActive: true,
    order: 10
  },
  // CASA HOTEL - STANDARD (Standard Suite)
  {
    roomId: 'CH11',
    name: 'Hab 11 San Jorge',
    number: '11',
    m2: '25 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'STANDARD', lugar: 'casaHotel' },
    isActive: true,
    order: 11
  },
  // CASA HOTEL - STANDARD (Standard Suite)
  {
    roomId: 'CH12',
    name: 'Hab 12 San Guillermo',
    number: '12',
    m2: '25 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'STANDARD', lugar: 'casaHotel' },
    isActive: true,
    order: 12
  },
  // CASA HOTEL - STANDARD (Standard Suite)
  {
    roomId: 'CH13',
    name: 'Hab 13 San Miguel',
    number: '13',
    m2: '25 m2',
    bed: 'QUEEN',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'STANDARD', lugar: 'casaHotel' },
    isActive: true,
    order: 13
  },
  // CASA HOTEL - SUITE (Junior Suite)
  {
    roomId: 'CH14',
    name: 'Hab 14 San Isidro',
    number: '14',
    m2: '28 m2',
    bed: 'KING',
    capacity: 2,
    description: '',
    type: 'casa_hotel',
    roomType: { type: 'SUITE', lugar: 'casaHotel' },
    isActive: true,
    order: 14
  },
  // CASA HOTEL - MASTER (Master Suite)
  {
    roomId: 'CH15',
    name: 'Hab 15 San Pedro',
    number: '15',
    m2: '59 m2',
    bed: 'DOBLE',
    capacity: 4,
    description: 'DOS CAMAS QUEEN SIZE',
    type: 'casa_hotel',
    roomType: { type: 'MASTER', lugar: 'casaHotel' },
    isActive: true,
    order: 15
  },

  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT101',
    name: 'Habitacion 101',
    number: '1',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 1
  },
  // HOTEL BOUTIQUE - STANDARD (Standard Deluxe)
  {
    roomId: 'BT102',
    name: 'Habitacion 102',
    number: '2',
    m2: '',
    bed: 'QUEEN SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA',
    type: 'boutique',
    roomType: { type: 'STANDARD', lugar: 'boutique' },
    isActive: true,
    order: 2
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT103',
    name: 'Habitacion 103',
    number: '3',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 3
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT104',
    name: 'Habitacion 104',
    number: '4',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA / TINA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 4
  },
  // HOTEL BOUTIQUE - STANDARD (Standard Deluxe)
  {
    roomId: 'BT105',
    name: 'Habitacion 105',
    number: '5',
    m2: '',
    bed: 'QUEEN SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA',
    type: 'boutique',
    roomType: { type: 'STANDARD', lugar: 'boutique' },
    isActive: true,
    order: 5
  },
  // HOTEL BOUTIQUE - STANDARD (Standard Deluxe)
  {
    roomId: 'BT106',
    name: 'Habitacion 106',
    number: '6',
    m2: '',
    bed: 'QUEEN SIZE',
    capacity: 2,
    description: 'TERRAZA TRASERA / TINA',
    type: 'boutique',
    roomType: { type: 'STANDARD', lugar: 'boutique' },
    isActive: true,
    order: 6
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT107',
    name: 'Habitacion 107',
    number: '7',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA JARDIN',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 7
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT108',
    name: 'Habitacion 108',
    number: '8',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA JARDIN',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 8
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT109',
    name: 'Habitacion 109',
    number: '9',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA JARDIN',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 9
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT110',
    name: 'Habitacion 110',
    number: '10',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TERRAZA JARDIN',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 10
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT200',
    name: 'Habitacion 200',
    number: '11',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TINA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 11
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT201',
    name: 'Habitacion 201',
    number: '12',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TINA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 12
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT202',
    name: 'Habitacion 202',
    number: '13',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TINA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 13
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT203',
    name: 'Habitacion 203',
    number: '14',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: 'TINA',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 14
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT204',
    name: 'Habitacion 204',
    number: '15',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: '',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 15
  },
  // HOTEL BOUTIQUE - SUITE (Junior Suite Deluxe)
  {
    roomId: 'BT205',
    name: 'Habitacion 205',
    number: '16',
    m2: '',
    bed: 'KING SIZE',
    capacity: 2,
    description: '',
    type: 'boutique',
    roomType: { type: 'SUITE', lugar: 'boutique' },
    isActive: true,
    order: 16
  },
  // HOTEL BOUTIQUE - MASTER (Master Suite Deluxe)
  {
    roomId: 'BT206',
    name: 'Habitacion 206',
    number: '17',
    m2: '',
    bed: '2 QUEEN SIZE',
    capacity: 4,
    description: '',
    type: 'boutique',
    roomType: { type: 'MASTER', lugar: 'boutique' },
    isActive: true,
    order: 17
  },
  // HOTEL BOUTIQUE - MASTER (Master Suite Deluxe)
  {
    roomId: 'BT207',
    name: 'Habitacion 207',
    number: '18',
    m2: '',
    bed: '2 QUEEN SIZE',
    capacity: 4,
    description: '',
    type: 'boutique',
    roomType: { type: 'MASTER', lugar: 'boutique' },
    isActive: true,
    order: 18
  },
  // HOTEL BOUTIQUE - MASTER (Master Suite Deluxe)
  {
    roomId: 'BT208',
    name: 'Habitacion 208',
    number: '19',
    m2: '',
    bed: '2 QUEEN SIZE',
    capacity: 4,
    description: '',
    type: 'boutique',
    roomType: { type: 'MASTER', lugar: 'boutique' },
    isActive: true,
    order: 19
  },
  // HOTEL BOUTIQUE - MASTER (Master Suite Deluxe)
  {
    roomId: 'BT209',
    name: 'Habitacion 209',
    number: '20',
    m2: '',
    bed: '2 QUEEN SIZE',
    capacity: 4,
    description: '',
    type: 'boutique',
    roomType: { type: 'MASTER', lugar: 'boutique' },
    isActive: true,
    order: 20
  },
  // HOTEL BOUTIQUE - MASTER (Master Suite Deluxe)
  {
    roomId: 'BT210',
    name: 'Habitacion 210',
    number: '21',
    m2: '',
    bed: '2 QUEEN SIZE',
    capacity: 4,
    description: '',
    type: 'boutique',
    roomType: { type: 'MASTER', lugar: 'boutique' },
    isActive: true,
    order: 21
  }
];

module.exports = ASSIGNMENT_ROOMS_SEED;
