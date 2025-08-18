const RIDE_TYPES = [
  {
    id: "standard",
    name: "Standard",
    description: "1-4 passengers",
    seats: 4,
    icon: "car" as const,
    priceMultiplier: 1.0,
  },
  {
    id: "comfort", 
    name: "Comfort",
    description: "1-6 passengers",
    seats: 6,
    icon: "car-sport" as const,
    priceMultiplier: 1.2,
  },
  {
    id: "xl",
    name: "XL", 
    description: "1-7+ passengers",
    seats: 7,
    icon: "bus" as const,
    priceMultiplier: 1.5,
  },
];

export default RIDE_TYPES