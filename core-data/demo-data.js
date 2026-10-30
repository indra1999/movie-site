// ============================================================================
// core-data/demo-data.js  —  DEMO POSTS + DEMO UPCOMING RELEASES
// Pure data file. The website (index.html) and the admin panel both read from
// here. Admin "Manage Posts" copies these into your editable list automatically,
// so you can Edit / Delete them like any other post.
// You never need to edit this file.
// ============================================================================
(function () {
    'use strict';
    const now = Date.now();
            const defaultReviews = [
                {
                    id: "rev-1",
                    title: "The Ugly",
                    year: "2025",
                    tagline: "No secret stays buried forever.",
                    category: "Movie",
                    industry: "Korean Movies",
                    breadcrumb: "MOVIES › KOREAN MOVIES",
                    language: "Korean",
                    rating: "6.6",
                    ageRating: "PG-13",
                    duration: "1h 42m",
                    platform: "AMZN",
                    uploadedAt: now - (4 * 60 * 60 * 1000),
                    baseViews: 472,
                    safetyLevel: "Moderate",
                    director: "Yeon Sang-ho",
                    writers: "Yeon Sang-ho, Ryu Yong-jae",
                    releaseFullDate: "15 Oct 2025",
                    country: "South Korea",
                    backdrop: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80",
                    poster: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=600&q=80",
                    stills: [
                        "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80"
                    ],
                    trailerUrl: "",
                    genres: ["Mystery", "Thriller"],
                    tags: ["Korean Movies", "Korean", "2025", "Zero Nudity", "Mystery", "Thriller"],
                    summary: "After the skeletal remains of a long-missing woman are uncovered after 40 years, her son and a documentary producer dig into the chilling secrets buried by their family and town.",
                    parentalGuide: {
                        sexNudity: "None — Zero nudity or sexual scenes.",
                        violence: "Moderate — Tense confrontations, skeletal remains, and dark murder investigation themes.",
                        profanity: "Mild — Occasional tense dialogue.",
                        drugsAlcohol: "Mild — Social drinking scenes."
                    },
                    verdict: "Clean from explicit scenes; safe for mature teens (14+) and mystery lovers.",
                    cast: [
                        { actorId: "park-jeong-min", name: "Park Jeong-min", character: "Im Dong-hwan", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80" },
                        { actorId: "kwon-hae-hyo", name: "Kwon Hae-hyo", character: "Im Yeong-gyu", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80" }
                    ],
                    episodes: [],
                    defaultComments: [
                        { user: "Rahul S.", text: "Watched with parents, no awkward scenes at all! Great suspense.", time: "1 hour ago" }
                    ]
                },
                {
                    id: "rev-2",
                    title: "Ali Baba Aur 40 Bhoot",
                    year: "2026",
                    tagline: "Spooky comedy adventure for the whole family.",
                    category: "TV Series",
                    industry: "Hindi TV Series",
                    breadcrumb: "TV SERIES › HINDI TV SERIES",
                    language: "Hindi",
                    rating: "7.4",
                    ageRating: "TV-14",
                    duration: "1 Season",
                    platform: "JHS",
                    uploadedAt: now - (9 * 60 * 60 * 1000),
                    baseViews: 396,
                    safetyLevel: "Safe",
                    director: "Kenny Basumatary",
                    writers: "Bhuvanesh Shrivastava, Jitesh Ramakrishnan",
                    releaseFullDate: "11 Sep 2026",
                    country: "India",
                    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
                    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
                    stills: [
                        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80"
                    ],
                    trailerUrl: "https://www.youtube.com/embed/ga0iTWXCGa0",
                    genres: ["Comedy", "Mystery"],
                    tags: ["Hindi TV Series", "Hindi", "2026", "Zero Nudity", "Comedy", "Mystery"],
                    summary: "A quirky group of friends accidentally unlocks an ancient haveli haunted by forty mischievous ghosts, leading to hilarious chaos and mystery.",
                    parentalGuide: {
                        sexNudity: "None — 100% family clean.",
                        violence: "Mild — Slapstick spooky comedy scenes.",
                        profanity: "None — Clean humour.",
                        drugsAlcohol: "None."
                    },
                    verdict: "Fun horror-comedy suitable for watching together with family.",
                    cast: [
                        { actorId: "omar-sy", name: "Asha Negi", character: "Lead Role", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80" },
                        { actorId: "ludivine-sagnier", name: "Vishal Vashishtha", character: "Ali", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80" }
                    ],
                    episodes: [
                        { ep: 1, title: "Episode 1: The Haveli Door", rating: "7.8", desc: "Ali and his friends step inside the locked mansion.", thumb: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80" },
                        { ep: 2, title: "Episode 2: Ghostly Guests", rating: "7.6", desc: "The 40 ghosts reveal their hilarious secret pact.", thumb: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80" }
                    ],
                    defaultComments: []
                },
                {
                    id: "rev-3",
                    title: "Invictus",
                    year: "2009",
                    tagline: "His people needed a leader. He gave them a champion.",
                    category: "Movie",
                    industry: "Hollywood",
                    breadcrumb: "MOVIES › HOLLYWOOD",
                    language: "English",
                    rating: "7.3",
                    ageRating: "PG-13",
                    duration: "2h 14m",
                    platform: "BluRay",
                    uploadedAt: now - (5 * 60 * 60 * 1000),
                    baseViews: 157,
                    safetyLevel: "Safe",
                    director: "Clint Eastwood",
                    writers: "Anthony Peckham, John Carlin",
                    releaseFullDate: "11 Dec 2009",
                    country: "USA",
                    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
                    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
                    stills: [
                        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
                    ],
                    trailerUrl: "https://www.youtube.com/embed/ByXuk9QqQkk",
                    genres: ["Biography", "Drama", "Sport"],
                    tags: ["Hollywood", "English", "Zero Nudity", "Family Safe"],
                    summary: "Nelson Mandela, in his first term as President of South Africa, initiates a unique venture to unite the Apartheid-torn land: enlist the national rugby team on a mission to win the 1995 Rugby World Cup.",
                    parentalGuide: {
                        sexNudity: "None — 100% clean.",
                        violence: "Mild — Standard sports rugby tackles.",
                        profanity: "Mild — Very brief sports locker room language.",
                        drugsAlcohol: "Very Mild."
                    },
                    verdict: "Inspirational true story — highly recommended for family viewing.",
                    cast: [
                        { actorId: "omar-sy", name: "Morgan Freeman", character: "Nelson Mandela", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80" }
                    ],
                    episodes: [],
                    defaultComments: []
                },
                {
                    id: "rev-4",
                    title: "Spirited Horizons",
                    year: "2026",
                    tagline: "Beyond the clouds lies the forgotten realm.",
                    category: "Anime",
                    industry: "Anime Movies",
                    breadcrumb: "ANIME › JAPANESE ANIME",
                    language: "Japanese",
                    rating: "8.9",
                    ageRating: "G",
                    duration: "2h 05m",
                    platform: "CR",
                    uploadedAt: now - (24 * 60 * 60 * 1000),
                    baseViews: 1241,
                    safetyLevel: "Safe",
                    director: "Makoto Shinkai",
                    writers: "Makoto Shinkai",
                    releaseFullDate: "02 May 2026",
                    country: "Japan",
                    backdrop: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
                    poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
                    stills: [
                        "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80"
                    ],
                    trailerUrl: "https://www.youtube.com/embed/ByXuk9QqQkk",
                    genres: ["Adventure", "Fantasy"],
                    tags: ["Anime Movies", "Japanese", "2026", "Zero Nudity", "Action"],
                    summary: "A young village boy discovers an ancient sky-lantern that guides him to a floating island of forgotten spirits, teaching him courage and kindness.",
                    parentalGuide: {
                        sexNudity: "None — 100% clean and wholesome.",
                        violence: "None — Harmless fantasy adventure.",
                        profanity: "None.",
                        drugsAlcohol: "None."
                    },
                    verdict: "100% Kids & Family Safe masterpiece.",
                    cast: [
                        { actorId: "park-jeong-min", name: "Kenjiro Tsuda", character: "Spirit Guardian (Voice)", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80" }
                    ],
                    episodes: [],
                    defaultComments: []
                }
            ];

            const defaultUpcoming = [
                {
                    id: "up-1",
                    title: "The Runner: Reckoning",
                    year: "2026",
                    releaseDate: "November 14, 2026",
                    type: "Movie",
                    releaseWhere: "In Theaters & IMAX",
                    expectedSafety: "PG-13 (Expected)",
                    rating: "TBA",
                    backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80",
                    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
                    note: "High-octane sci-fi sequel arriving in theaters nationwide."
                },
                {
                    id: "up-2",
                    title: "Shadows of Seoul: Season 2",
                    year: "2026",
                    releaseDate: "December 05, 2026",
                    type: "Web Series",
                    releaseWhere: "Netflix Official",
                    expectedSafety: "18+ Caution",
                    rating: "TBA",
                    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
                    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                    note: "The acclaimed Korean crime drama returns for its second chapter."
                }
            ];

    window.CINE_DEMO = { reviews: defaultReviews, upcoming: defaultUpcoming };
})();
