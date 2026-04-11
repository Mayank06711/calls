// Mock notification data for development
// Replace with real API data when backend is ready

const now = new Date();
const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

export const mockNotifications = [
  // === SUGGESTIONS (Affiliate products) ===
  {
    id: 's1',
    type: 'suggestion',
    message: 'Based on your style preferences...',
    product: {
      name: 'Floral Summer Dress',
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=120&h=120&fit=crop',
      link: 'https://www.myntra.com/',
      price: 1299,
      brand: 'Zara',
      color: { name: 'Red', hex: '#EF4444' },
      platform: 'Myntra',
    },
    read: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 's2',
    type: 'suggestion',
    message: 'Trending in your size...',
    product: {
      name: 'Classic Denim Jacket',
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=120&h=120&fit=crop',
      link: 'https://www.amazon.in/',
      price: 2499,
      brand: "Levi's",
      color: { name: 'Blue', hex: '#3B82F6' },
      platform: 'Amazon',
    },
    read: false,
    createdAt: daysAgo(1),
  },
  {
    id: 's3',
    type: 'suggestion',
    message: 'New arrival matching your palette...',
    product: {
      name: 'Silk Blend Kurta Set',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=120&h=120&fit=crop',
      link: 'https://www.ajio.com/',
      price: 1899,
      brand: 'FabIndia',
      color: { name: 'Emerald', hex: '#10B981' },
      platform: 'Ajio',
    },
    read: true,
    createdAt: daysAgo(2),
  },
  {
    id: 's4',
    type: 'suggestion',
    message: 'People with similar style bought this...',
    product: {
      name: 'Minimalist White Sneakers',
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=120&h=120&fit=crop',
      link: 'https://www.flipkart.com/',
      price: 3299,
      brand: 'Nike',
      color: { name: 'White', hex: '#F9FAFB' },
      platform: 'Flipkart',
    },
    read: true,
    createdAt: daysAgo(3),
  },

  // === SOCIAL ===
  {
    id: 'so1',
    type: 'social',
    action: 'like',
    user: { name: 'Riya Sharma', avatar: '' },
    content: 'Summer outfit collection',
    read: false,
    createdAt: hoursAgo(3),
  },
  {
    id: 'so2',
    type: 'social',
    action: 'follow',
    user: { name: 'Arjun Patel', avatar: '' },
    content: null,
    read: false,
    createdAt: hoursAgo(8),
  },
  {
    id: 'so3',
    type: 'social',
    action: 'comment',
    user: { name: 'Priya Menon', avatar: '' },
    content: 'Love the color combination!',
    read: true,
    createdAt: daysAgo(1),
  },

  // === PROMOTIONS ===
  {
    id: 'p1',
    type: 'promotion',
    title: 'Summer Sale is Live!',
    description: 'Up to 50% off on trending summer styles. Don\'t miss out!',
    discount: '50% OFF',
    expiresIn: '2 days',
    read: false,
    createdAt: hoursAgo(5),
  },
  {
    id: 'p2',
    type: 'promotion',
    title: 'Exclusive Member Offer',
    description: 'Get extra 20% off on your next purchase with code STYLE20.',
    discount: '20% OFF',
    expiresIn: '5 days',
    read: true,
    createdAt: daysAgo(1),
  },
  {
    id: 'p3',
    type: 'promotion',
    title: 'Free Shipping Weekend',
    description: 'Enjoy free shipping on all orders this weekend. No minimum purchase required.',
    discount: 'FREE SHIP',
    expiresIn: '1 day',
    read: true,
    createdAt: daysAgo(2),
  },

  // === SYSTEM ===
  {
    id: 'sys1',
    type: 'system',
    severity: 'warning',
    title: 'Scheduled Maintenance',
    message: 'Platform will be down on Jan 30, 2:00 AM - 4:00 AM IST. Please save your work before the maintenance window.',
    read: false,
    createdAt: daysAgo(1),
  },
  {
    id: 'sys2',
    type: 'system',
    severity: 'info',
    title: 'New Feature: Style Quiz',
    message: 'We\'ve launched a new Style Quiz to help personalize your recommendations. Try it out in your profile!',
    read: true,
    createdAt: daysAgo(3),
  },
  {
    id: 'sys3',
    type: 'system',
    severity: 'critical',
    title: 'Security Alert',
    message: 'A new login was detected from a different device. If this wasn\'t you, please change your password immediately.',
    read: false,
    createdAt: hoursAgo(6),
  },
];
