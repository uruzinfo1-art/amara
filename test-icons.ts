import * as Icons from 'lucide-react';
const icons = [
  'Briefcase', 'Wallet', 'Coins', 'Building', 'Store', 'Landmark', 'PiggyBank',
  'Book', 'BookOpen', 'GraduationCap', 'Library', 'PenTool', 'Laptop',
  'Plane', 'Map', 'Compass', 'Palmtree', 'Ticket', 'Tent', 'Luggage',
  'Home', 'Sofa', 'ChefHat', 'Sparkles', 'Paintbrush', 'Hammer', 'ShoppingCart',
  'Droplet', 'Zap', 'Lightbulb', 'Flame', 'Wifi', 'Phone', 'Plug',
  'HeartPulse', 'Heart', 'Stethoscope', 'Pill', 'Dumbbell', 'Activity', 'Cross', 'Syringe',
  'Car', 'Bike', 'Bus', 'Train', 'Ship', 'Fuel', 'Navigation',
  'Gamepad2', 'Tv', 'Smartphone', 'Monitor', 'Headphones', 'Camera', 'Film', 'Music', 'Speaker',
  'Gift', 'Scissors', 'Shirt', 'Trash', 'Wrench', 'Coffee', 'Utensils', 'WashingMachine'
];
const missing = icons.filter(icon => !(icon in Icons));
console.log('Missing icons:', missing.join(', '));
