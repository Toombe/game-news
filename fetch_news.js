const fs = require('fs');

const FEEDS = [
    { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
    { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed/news' },
    { name: 'The Verge (Games)', url: 'https://www.theverge.com/games/rss/index.xml' },
    { name: 'The Verge (Tech)', url: 'https://www.theverge.com/tech/rss/index.xml' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/gaming' },
    { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feeds/news' },
    { name: 'Push Square', url: 'https://www.pushsquare.com/feeds/news' },
    { name: 'Pure Xbox', url: 'https://www.purexbox.com/feeds/news' }
];

// Scalpel Filter: Only blocks specific AI/Crypto hype words
const BANNED_WORDS = ['chatgpt', 'openai', 'llm', 'bitcoin', 'ethereum', 'cryptocurrency', ' nft ', 'web3', 'blockchain', 'midjourney', 'stable diffusion'];
const BANNED_CATS = ['ai', 'artificial intelligence', 'crypto', 'cryptocurrency', 'nft', 'web3', 'blockchain'];
const AI_REGEX = /\b(ai)\b/gi; // Catches "AI" but not "Trailer" or "Mountain"

async function getNews() {
    let allArticles = [];

    for (const feed of FEEDS) {
        try {
            // Using rss2json to convert XML to clean JSON for easier processing
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
            const data = await response.json();

            if (data.items) {
                const filtered = data.items.filter(item => {
                    const title = item.title.toLowerCase();
                    const categories = (item.categories || []).map(c => c.toLowerCase());
                    
                    // 1. Check Hard Banned Categories from Publisher
                    if (categories.some(cat => BANNED_CATS.includes(cat))) return false;

                    // 2. Check Title for specific tech-hype keywords
                    if (BANNED_WORDS.some(word => title.includes(word))) return false;

                    // 3. Regex check for standalone "AI" in Title
                    if (AI_REGEX.test(title)) return false;

                    return true;
                });

                filtered.forEach(item => {
                    // Pick a clean category (ignore generic 'news' or 'gaming' tags)
                    const displayCategory = (item.categories || [])
                        .find(c => {
                            const low = c.toLowerCase();
                            return low !== 'news' && low !== 'gaming' && low !== 'articles' && low !== 'nintendo switch';
                        }) || item.categories[0] || 'Article';

                    allArticles.push({
                        title: item.title,
                        link: item.link,
                        thumbnail: item.thumbnail || item.enclosure?.link || '',
                        source: feed.name,
                        category: displayCategory,
                        date: new Date(item.pubDate).getTime()
                    });
                });
            }
        } catch (e) {
            console.error(`Failed to fetch ${feed.name}:`, e);
        }
    }

    // Sort by Newest First
    allArticles.sort((a, b) => b.date - a.date);

    // Save Top 60
    const finalNews = allArticles.slice(0, 60);

    fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2));
    console.log(`Successfully generated news.json with ${finalNews.length} articles.`);
}

getNews();