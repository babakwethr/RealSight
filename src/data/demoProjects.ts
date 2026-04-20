import { ReellyProject } from '@/types/reelly';

export const DEMO_PROJECTS: any[] = [
    {
        id: "demo-1",
        name: "Emaar Beachfront Residences",
        developer: "Emaar Properties",
        location: { district: "Dubai Harbour", city: "Dubai" },
        min_price: 2500000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q4 2026",
        sale_status: "Available",
        description: "Experience the ultimate beachfront living with panoramic views of the Arabian Gulf and Dubai Marina skyline. Premium amenities including private beach access.",
        cover_image: { url: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 60,
            on_handover: 40,
            post_handover: 0
        }
    },
    {
        id: "demo-2",
        name: "Atlantis The Royal Residences",
        developer: "Kerzner International",
        location: { district: "Palm Jumeirah", city: "Dubai" },
        min_price: 15000000,
        currency: "AED",
        construction_status: "Ready",
        completion_date: "Ready",
        sale_status: "Limited Availability",
        description: "An iconic luxury destination offering bespoke residential apartments with exclusive access to world-class dining and entertainment at Atlantis The Royal.",
        cover_image: { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 20,
            on_handover: 80,
            post_handover: 0
        }
    },
    {
        id: "demo-3",
        name: "Burj Binghatti Jacob & Co Residences",
        developer: "Binghatti Developers",
        location: { district: "Business Bay", city: "Dubai" },
        min_price: 8000000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q2 2027",
        sale_status: "Available",
        description: "The world's highest residential tower in partnership with luxury watch and jewelry brand Jacob & Co. Unparalleled luxury and avant-garde design.",
        cover_image: { url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 70,
            on_handover: 30,
            post_handover: 0
        }
    },
    {
        id: "demo-4",
        name: "Damac Hills 2 - Verona",
        developer: "Damac Properties",
        location: { district: "Damac Hills 2", city: "Dubai" },
        min_price: 1200000,
        currency: "AED",
        construction_status: "Initial Stage",
        completion_date: "Q1 2027",
        sale_status: "Available",
        description: "Family-friendly townhouses in a vibrant master community featuring a water town, sports town, and extensive green spaces.",
        cover_image: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 50,
            on_handover: 50,
            post_handover: 0
        }
    },
    {
        id: "demo-5",
        name: "One Za'abeel Residences",
        developer: "Ithra Dubai",
        location: { district: "Za'abeel", city: "Dubai" },
        min_price: 3800000,
        currency: "AED",
        construction_status: "Ready",
        completion_date: "Ready",
        sale_status: "Available",
        description: "An architectural masterpiece in the heart of Dubai, featuring the world's longest panoramic sky podium (The Link) and ultra-luxury residential units.",
        cover_image: { url: "https://images.unsplash.com/photo-1577457713437-0ea876274070?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1577457713437-0ea876274070?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 0,
            on_handover: 100,
            post_handover: 0
        }
    },
    {
        id: "demo-6",
        name: "Sobha Hartland II - 350 Riverside",
        developer: "Sobha Realty",
        location: { district: "Mohammed Bin Rashid City", city: "Dubai" },
        min_price: 1800000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q4 2025",
        sale_status: "Available",
        description: "Waterfront apartments with an impeccable finish, offering stunning views of pristine lagoons and the Downtown Dubai skyline.",
        cover_image: { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 60,
            on_handover: 40,
            post_handover: 0
        }
    },
    {
        id: "demo-7",
        name: "Nakheel Como Residences",
        developer: "Nakheel",
        location: { district: "Palm Jumeirah", city: "Dubai" },
        min_price: 21000000,
        currency: "AED",
        construction_status: "Initial Stage",
        completion_date: "Q3 2027",
        sale_status: "Selling Fast",
        description: "An exclusive water-inspired tower redefining Palm Jumeirah's skyline, offering ultra-luxurious expansive residences with private pools.",
        cover_image: { url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 80,
            on_handover: 20,
            post_handover: 0
        }
    },
    {
        id: "demo-8",
        name: "Ellington Ocean House",
        developer: "Ellington Properties",
        location: { district: "Palm Jumeirah", city: "Dubai" },
        min_price: 9500000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q1 2026",
        sale_status: "Limited Availability",
        description: "Boutique ultra-luxury oceanfront living concept with lush landscaping, private club amenities, and contemporary architectural elegance.",
        cover_image: { url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 60,
            on_handover: 40,
            post_handover: 0
        }
    },
    {
        id: "demo-9",
        name: "Meraas Bluewaters Bay",
        developer: "Meraas",
        location: { district: "Bluewaters Island", city: "Dubai" },
        min_price: 3200000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q3 2027",
        sale_status: "Available",
        description: "Modern seaside living with unobstructed views of the Arabian Gulf and Ain Dubai, situated between JBR and Bluewaters Island.",
        cover_image: { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 80,
            on_handover: 20,
            post_handover: 0
        }
    },
    {
        id: "demo-10",
        name: "Omniyat The Lana Residences",
        developer: "Omniyat",
        location: { district: "Business Bay", city: "Dubai" },
        min_price: 14000000,
        currency: "AED",
        construction_status: "Ready",
        completion_date: "Ready",
        sale_status: "Available",
        description: "Managed by Dorchester Collection, offering unparalleled design by Foster + Partners and interiors by Gilles & Boissier along the Marasi Marina.",
        cover_image: { url: "https://images.unsplash.com/photo-1628611225249-6c47bf621576?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1628611225249-6c47bf621576?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 0,
            on_handover: 100,
            post_handover: 0
        }
    },
    {
        id: "demo-11",
        name: "Dubai Properties La Rosa VI",
        developer: "Dubai Properties",
        location: { district: "Villanova", city: "Dubai" },
        min_price: 1800000,
        currency: "AED",
        construction_status: "Under Construction",
        completion_date: "Q4 2025",
        sale_status: "Available",
        description: "Spacious 3 and 4 bedroom townhouses within a serene community featuring lush green parks, walking trails, and family amenities.",
        cover_image: { url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 50,
            on_handover: 50,
            post_handover: 0
        }
    },
    {
        id: "demo-12",
        name: "Al Futtaim Al Badia Terraces",
        developer: "Al Futtaim Group",
        location: { district: "Dubai Festival City", city: "Dubai" },
        min_price: 2200000,
        currency: "AED",
        construction_status: "Initial Stage",
        completion_date: "Q2 2026",
        sale_status: "Available",
        description: "Exclusive residential apartments nested within the lush greens of Al Badia Golf Club, offering a tranquil retreat with urban connectivity.",
        cover_image: { url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=1600" },
        media: {
            architecture: [{ url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=1600" }],
            interior: [],
            floor_plans: []
        },
        payment_plan: {
            during_construction: 40,
            on_handover: 60,
            post_handover: 0
        }
    }
];
